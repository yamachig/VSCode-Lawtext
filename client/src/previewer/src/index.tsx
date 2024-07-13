import React from "react";
import { createRoot } from "react-dom/client";
import { HTMLAnyELs } from "lawtext/dist/src/renderer/rules/any";
import htmlCSS from "lawtext/dist/src/renderer/rules/htmlCSS";
import type * as std from "lawtext/dist/src/law/std";
import type { PreviewerOptions } from "./optionsInterface";
import { omit, throttle } from "lawtext/dist/src/util";
import type { HTMLOptions } from "lawtext/dist/src/renderer/common/html";
import type { EL } from "lawtext/dist/src/node/el";
import { loadEL } from "lawtext/dist/src/node/el/loadEL";
import type { ActionCounter } from "./offset";
import { getCenterOffset, scrollToOffset } from "./offset";


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
    if (stateJSON.els) ret.els = stateJSON.els.map(loadEL);
    ret.htmlOptions = { ...htmlOptions, ...(getFigData ? { getFigData } : {}) };
    return ret;
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


