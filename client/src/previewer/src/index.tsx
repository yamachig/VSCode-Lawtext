import React from "react";
import { createRoot } from "react-dom/client";
import { HTMLAnyELs } from "lawtext/dist/src/renderer/rules/any";
import htmlCSS from "lawtext/dist/src/renderer/rules/htmlCSS";
import * as std from "lawtext/dist/src/law/std";
import { PreviewerState, PreviewerStateJSON, toState, toStateJSON } from "./stateInterface";


const vscode = acquireVsCodeApi<PreviewerStateJSON>();
const previousState = toState(vscode.getState() ?? { els: [], htmlOptions: {}, scrollOffset: 0 });


function throttle<TArgs extends unknown[]>(func: (...args: TArgs) => unknown, waitms: number) {
    let timer: NodeJS.Timeout| undefined = undefined;
    const lastArgsObj: {args?: TArgs} = {};
    return (...args: TArgs) => {
        lastArgsObj.args = args;
        if (timer !== undefined) {
            return;
            // clearTimeout(timer);
        }
        timer = setTimeout(() => {
            func(...(lastArgsObj.args as TArgs));
            timer = undefined;
            lastArgsObj.args = undefined;
        }, waitms);
    };
}

interface ActionCounter {
    scroll: number;
}

const scrollToOffset = (offset: number) => {
    const rangeInfo = {
        start: {
            d: null as number | null,
            top: 0,
        },
        end: {
            d: null as number | null,
            top: null as number | null,
        },
    };
    for (const el of Array.from(document.querySelectorAll("[data-lawtext_range]"))) {
        const range = JSON.parse((el as HTMLElement).dataset["lawtext_range"] ?? "");
        if (!range) return;
        const relStart = range[0] - offset;
        const relEnd = range[1] - offset;
        const rect = el.getBoundingClientRect();
        const [startTop, startD] = relEnd <= 0 ? [rect.bottom, relEnd] : [rect.top, relStart];
        const [endTop, endD] = relStart >= 0 ? [rect.top, relStart] : [rect.bottom, relEnd];
        if (startD <= 0 && ((rangeInfo.start.d === null) || (rangeInfo.start.d < startD))) {
            rangeInfo.start.top = startTop;
            rangeInfo.start.d = startD;
        }
        if (0 <= endD && ((rangeInfo.end.d === null) || (endD < rangeInfo.end.d))) {
            rangeInfo.end.top = endTop;
            rangeInfo.end.d = endD;
        }
    }
    if ((rangeInfo.start.d === null) || (rangeInfo.end.d === null) || (rangeInfo.end.top === null)) return;
    const r = -rangeInfo.start.d / (rangeInfo.end.d - rangeInfo.start.d);
    const top = rangeInfo.start.top + r * (rangeInfo.end.top - rangeInfo.start.top);
    const scrollEL = document.querySelector("html");
    if (!scrollEL) return;
    const scrollELRect = scrollEL.getBoundingClientRect();
    const newScrollTop = (top - scrollELRect.top) - window.innerHeight / 2;
    if (!Number.isFinite(newScrollTop)) return;

    scrollEL.scrollTop = newScrollTop;
};


const getCenterOffset = (visibleELs: Set<HTMLElement>) => {
    const scrollEL = document.querySelector("html");
    if (!scrollEL) return;
    const centerHeight = window.innerHeight / 2;
    const rangeInfo = {
        start: {
            offset: 0,
            y: null as number | null,
        },
        end: {
            offset: null as number | null,
            y: null as number | null,
        },
    };
    for (const el of visibleELs) {
        const range = JSON.parse(el.dataset["lawtext_range"] ?? "");
        if (!range) continue;
        const rect = el.getBoundingClientRect();
        const relTop = rect.top - centerHeight;
        const relBottom = rect.bottom - centerHeight;
        const [startY, startOffset] = relBottom <= 0 ? [relBottom, range[1]] : [relTop, range[0]];
        const [endY, endOffset] = relTop >= 0 ? [relTop, range[0]] : [relBottom, range[1]];
        if (startY <= 0 && ((rangeInfo.start.y === null) || (rangeInfo.start.y < startY))) {
            rangeInfo.start.offset = startOffset;
            rangeInfo.start.y = startY;
        }
        if (0 <= endY && ((rangeInfo.end.y === null) || (endY < rangeInfo.end.y))) {
            rangeInfo.end.offset = endOffset;
            rangeInfo.end.y = endY;
        }
    }
    if ((rangeInfo.start.y === null) || (rangeInfo.end.y === null) || (rangeInfo.end.offset === null)) return;
    const r = -rangeInfo.start.y / (rangeInfo.end.y - rangeInfo.start.y);
    const offset = Math.round(rangeInfo.start.offset + r * (rangeInfo.end.offset - rangeInfo.start.offset));
    if (!Number.isFinite(offset)) return;
    return offset;
};

const App = () => {
    const [state, _setState] = React.useState<PreviewerState>(previousState);
    const { els, htmlOptions } = state;

    const visibleELs = React.useMemo(() => new Set<HTMLElement>(), []);

    const counter = React.useMemo<ActionCounter>(() => ({ scroll: 0 }), []);

    const setState = React.useCallback((newStateFunc: (prevState: PreviewerState) => PreviewerState) => {
        _setState(prevState => {
            const newState = newStateFunc(prevState);
            vscode.setState(toStateJSON(newState));
            return newState;
        });
    }, []);

    const setStateJSON = React.useCallback((newStateJSONFunc: (prevStateJSON: PreviewerStateJSON) => PreviewerStateJSON) => {
        _setState(prevState => {
            const newStateJSON = newStateJSONFunc(prevState);
            vscode.setState(newStateJSON);
            return toState(newStateJSON);
        });
    }, []);


    React.useEffect(() => {
        const observerCallback: IntersectionObserverCallback = (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    visibleELs.add(entry.target as HTMLElement);
                } else {
                    visibleELs.delete(entry.target as HTMLElement);
                }
            }
        };
        const observer = new IntersectionObserver(observerCallback);
        for (const el of Array.from(document.querySelectorAll("[data-lawtext_range]"))) {
            observer.observe(el);
        }
        return () => {
            observer.disconnect();
            visibleELs.clear();
        };
    }, [state.els, visibleELs]);

    React.useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onMessage = (event: any) => {
            if (event.data?.command === "setState") {
                setStateJSON(() => event.data.state as PreviewerStateJSON);
            }
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [setStateJSON]);

    React.useEffect(() => {
        console.log(`scrollOffset changed: ${state.scrollOffset}`);
        scrollToOffset(state.scrollOffset);
    }, [state.scrollOffset]);

    React.useEffect(() => {
        const onScroll = () => {
            if (counter.scroll > 0) {
                counter.scroll--;
            } else {
                counter.scroll++;
                const offset = getCenterOffset(visibleELs);
                if (typeof offset === "number") {
                    setState(prevState => ({ ...prevState, scrollOffset: offset }));
                } else {
                    counter.scroll--;
                }
            }
        };
        const throttleOnScroll = throttle(onScroll, 100);
        window.addEventListener("scroll", throttleOnScroll);
        window.addEventListener("resize", throttleOnScroll);
        return () => {
            window.removeEventListener("scroll", throttleOnScroll);
            window.removeEventListener("resize", throttleOnScroll);
        };
    }, [counter.scroll, setState, visibleELs]);

    return (<>
        <style>
            {htmlCSS}
        </style>
        <HTMLAnyELs
            els={els as (string | std.StdEL | std.__EL)[]}
            indent={0}
            {...{ htmlOptions: {
                ...htmlOptions,
                annotateLawtextRange: true,
            } }}
        />
    </>);
};

const rootElement = document.getElementById("root");

if (rootElement) {
    createRoot(rootElement).render(<App/>);
}


