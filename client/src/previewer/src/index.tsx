import React from "react";
import { createRoot } from "react-dom/client";
import { HTMLAnyELs } from "lawtext/dist/src/renderer/rules/any";
import htmlCSS from "lawtext/dist/src/renderer/rules/htmlCSS";
import * as std from "lawtext/dist/src/law/std";
import { PreviewerOptions } from "./stateInterface";
import { omit } from "lawtext/dist/src/util";
import { HTMLOptions } from "lawtext/dist/src/renderer/common/html";
import { EL, loadEl } from "lawtext/dist/src/node/el";


const vscode = acquireVsCodeApi<WebviewState>();

interface WebviewState {
    els: PreviewerOptions["els"];
    htmlOptions: PreviewerOptions["htmlOptions"];
    scrollRatioMemo: number;
}

interface PreviewerState {
    els: EL[],
    htmlOptions: HTMLOptions,
}

export const toWebviewState = (state: Partial<PreviewerState>): Partial<WebviewState> => {
    const htmlOptions: WebviewState["htmlOptions"] | undefined = state.htmlOptions ? {
        ...omit(state.htmlOptions, "getFigData"),
    } : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const figDataMap = (state.htmlOptions?.getFigData as any)?.figDataMap;
    if (figDataMap && htmlOptions) {
        htmlOptions.figDataMap = figDataMap;
    }
    const ret: Partial<WebviewState> = {};
    if (state.els) ret.els = state.els.map(el => el.json(true, true));
    if (htmlOptions) ret.htmlOptions = htmlOptions;
    return ret;
};

const toPreviewerState = (stateJSON: Partial<WebviewState>): Partial<PreviewerState> => {
    const htmlOptions: HTMLOptions | undefined = stateJSON.htmlOptions ? {
        ...omit(stateJSON.htmlOptions, "figDataMap"),
    } : undefined;
    const getFigData = (
        stateJSON.htmlOptions?.figDataMap
        && ((src: string) => (stateJSON.htmlOptions?.figDataMap?.[src] ?? null))
    );
    if (getFigData && stateJSON.htmlOptions?.figDataMap) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (getFigData as any).figDataMap = stateJSON.htmlOptions.figDataMap;
    }
    const ret: Partial<PreviewerState> = {};
    if (stateJSON.els) ret.els = stateJSON.els.map(loadEl);
    ret.htmlOptions = { ...htmlOptions, ...(getFigData ? { getFigData } : {}) };
    return ret;
};


function throttle<TArgs extends unknown[]>(func: (...args: TArgs) => unknown, waitms: number, initialWaitms?: number) {
    let timer: NodeJS.Timeout| undefined = undefined;
    const lastArgsObj: {args?: TArgs} = {};
    const dispatchLastArgs = () => {
        if (lastArgsObj.args) {
            const args = lastArgsObj.args;
            lastArgsObj.args = undefined;
            func(...args);
            timer = setTimeout(dispatchLastArgs, waitms);
        } else {
            timer = undefined;
        }
    };
    return (...args: TArgs) => {
        lastArgsObj.args = args;
        if (timer === undefined) {
            timer = setTimeout(dispatchLastArgs, initialWaitms ?? waitms);
        }
    };
}

interface ActionCounter {
    scroll: number;
}

const scrollToOffset = (offset: number, counter: ActionCounter) => {
    console.log(`scrollToOffset: ${offset}`);
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

    counter.scroll += 1;
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
    const [state, setState] = React.useState<PreviewerState>(() => {
        const prevWebviewState = vscode.getState();
        return {
            els: [],
            htmlOptions: {},
            scrollRatioMemo: 0,
            ...(prevWebviewState ? toPreviewerState(prevWebviewState) : {}),
        };
    });
    const { els, htmlOptions } = state;

    const visibleELs = React.useMemo(() => new Set<HTMLElement>(), []);

    const counter = React.useMemo<ActionCounter>(() => ({ scroll: 0 }), []);

    // Run on first render of els
    React.useEffect(() => {
        const webviewState = vscode.getState();
        if (webviewState && webviewState.scrollRatioMemo > 0) {
            const scrollEL = document.querySelector("html");
            if (!scrollEL) return;
            counter.scroll += 1;
            scrollEL.scrollTop = scrollEL.scrollHeight * webviewState.scrollRatioMemo;
        }

        const anchorOnClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            vscode.postMessage({
                command: "openLink",
                href: (e.currentTarget as HTMLAnchorElement).href,
            });
        };

        const anchors = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];

        for (const a of anchors) {
            a.addEventListener("click", anchorOnClick);
        }

        return () => {
            for (const a of anchors) {
                a.removeEventListener("click", anchorOnClick);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [els]);


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
            if (event.data?.command === "setOptions") {
                console.log(`Received setOptions: ${JSON.stringify(omit(event.data.options, "els"))}`);
                const options = event.data.options as PreviewerOptions;
                vscode.setState({
                    ...(vscode.getState() as WebviewState),
                    ...omit(options, "centerOffset"),
                });
                setState(prevState => ({ ...prevState, ...toPreviewerState(options) }));
                setTimeout(() => {
                    if (typeof options.centerOffset === "number") {
                        scrollToOffset(options.centerOffset, counter);
                    }
                }, 0);
            }
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [counter]);

    React.useEffect(() => {
        const onCenterOffsetChanged = () => {
            vscode.postMessage({
                command: "centerOffsetChanged",
                offset: getCenterOffset(visibleELs),
            });
        };
        const throttleOnCenterOffsetChanged = throttle(onCenterOffsetChanged, 100, 0);

        const saveScrollRatio = () => {
            const scrollEL = document.querySelector("html");
            if (!scrollEL) return;
            const scrollRatio = scrollEL.scrollTop / scrollEL.scrollHeight;
            vscode.setState({
                ...(vscode.getState() as WebviewState),
                scrollRatioMemo: scrollRatio,
            });
        };
        const throttleSaveScrollRatio = throttle(saveScrollRatio, 500);

        const onScroll = () => {
            throttleSaveScrollRatio();
            if (counter.scroll > 0) {
                counter.scroll--;
            } else {
                throttleOnCenterOffsetChanged();
            }
        };

        window.addEventListener("scroll", onScroll);
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, [counter, counter.scroll, setState, visibleELs]);

    React.useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.data?.command === "scrollToOffset") {
                scrollToOffset(event.data.offset, counter);
            }
        };

        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [counter]);

    const MemoHTMLAnyELs = React.useMemo(() => React.memo(HTMLAnyELs), []);

    return (<>
        <style>
            {htmlCSS}
        </style>
        <MemoHTMLAnyELs
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


