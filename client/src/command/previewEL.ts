import * as vscode from "vscode";
import * as renderer from "lawtext/dist/src/renderer";
import htmlCSS from "lawtext/dist/src/renderer/rules/htmlCSS";
import { EL } from "lawtext/dist/src/node/el";
import * as std from "lawtext/dist/src/law/std";
import path from "path";
import { pictMimeDict } from "lawtext/dist/src/util";
import _previewerScript from "../previewer/out/bundle.js.txt";
import { PreviewerOptions } from "../previewer/src/stateInterface";

const previewerScript = _previewerScript.replace(/<\/script>/g, "</ script>");

const renderHTMLFragment = (el: EL, convertFigUri?: (src: string) => vscode.Uri) => {
    const getFigData = (src: string) => {
        const ext = path.extname(src) as keyof typeof pictMimeDict;
        const type = ext in pictMimeDict ? pictMimeDict[ext] : "application/octet-stream";
        const convertedUri = convertFigUri ? convertFigUri(src) : vscode.Uri.parse(src);
        return { url: convertedUri.toString(), type };
    };
    const fragment = renderer.renderHTML(
        el,
        {
            renderControlEL: true,
            getFigData,
            renderPDFAsLink: true,
            annotateLawtextRange: true,
        });
    return fragment;
};

export class Broadcast<T> {
    private _listeners: Set<(e: T) => void> = new Set();
    public add(listener: (e: T) => void) {
        this._listeners.add(listener);
    }
    public remove(listener: (e: T) => void) {
        this._listeners.delete(listener);
    }
    public broadcast(e: T) {
        for (const listener of this._listeners) {
            listener(e);
        }
    }
}

export interface PreviewELOptions {
    context: vscode.ExtensionContext,
    el: EL,
    rawDocumentURI?: string,
    onCenterOffset?: (offset: number) => void,
    scrollEventTarget?: Broadcast<{offset: number}>,
    initialCenterOffset?: number | (() => number),
    panel?: vscode.WebviewPanel,
}

const getFigDataMap = (el: EL | string, convertFigSrc: (src: string) => string) => {
    const figDataMap: Record<string, {url: string, type: string}> = {};
    if (typeof el === "string") return figDataMap;
    if (std.isFig(el)) {
        const src = el.attr.src;
        const ext = path.extname(src) as keyof typeof pictMimeDict;
        const type = ext in pictMimeDict ? pictMimeDict[ext] : "application/octet-stream";
        figDataMap[src] = { url: convertFigSrc(src), type };
    }
    for (const child of el.children) {
        Object.assign(figDataMap, getFigDataMap(child, convertFigSrc));
    }
    return figDataMap;
};

export const previewEL = (options: PreviewELOptions) => {
    const { context, el, rawDocumentURI } = options;

    const panel = options.panel ?? vscode.window.createWebviewPanel(
        "lawtextPreview",
        "Lawtext Preview",
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
            enableFindWidget: true,
        },
    );

    const html = /*html*/`\
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>${htmlCSS}</style>
</head>
<body>
<div id="root"></div>
<script>
var exports = {};
${previewerScript}
</script>
</body>
</html>
`;

    panel.webview.html = html;

    const els = [el.json(true, true)];

    const figDataMap: Record<string, {url: string, type: string}> = {};

    if (rawDocumentURI !== undefined) {
        const convertFigSrc = (src: string) => {
            const documentURI = vscode.Uri.parse(rawDocumentURI);
            const uri = vscode.Uri.joinPath(documentURI, "../", src);
            const convertedUri = path.extname(src) === ".pdf" ? uri : panel.webview.asWebviewUri(uri);
            return convertedUri.toString();
        };
        Object.assign(figDataMap, getFigDataMap(el, convertFigSrc));
    }

    const htmlOptions: PreviewerOptions["htmlOptions"] = {
        renderControlEL: true,
        renderPDFAsLink: true,
        figDataMap,
    };

    const previewerOptions: PreviewerOptions = {
        els,
        htmlOptions,
    };

    const initialCenterOffset = (
        (typeof options.initialCenterOffset === "number")
            ? options.initialCenterOffset
            : (typeof options.initialCenterOffset === "function")
                ? options.initialCenterOffset()
                : undefined
    );

    if (initialCenterOffset !== undefined) previewerOptions.centerOffset = initialCenterOffset;

    panel.webview.postMessage({
        command: "setOptions",
        options: previewerOptions,
    });

    panel.webview.onDidReceiveMessage(
        message => {
            console.log(`Received message: ${message.command}`);
            if (message.command === "openLink") {
                const uri = vscode.Uri.parse(message.href);
                vscode.commands.executeCommand("vscode.open", uri);
            } else if (message.command === "centerOffsetChanged") {
                if (options.onCenterOffset) {
                    options.onCenterOffset(message.offset);
                }
            }
        },
        undefined,
        context.subscriptions
    );
};

export const ___previewEL = (options: PreviewELOptions) => {
    const { context, el, rawDocumentURI, scrollEventTarget } = options;

    const panel = options.panel ?? vscode.window.createWebviewPanel(
        "lawtextPreview",
        "Lawtext Preview",
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
            enableFindWidget: true,
        },
    );

    const convertFigUri = (rawDocumentURI !== undefined) ? (src: string) => {
        const documentURI = vscode.Uri.parse(rawDocumentURI);
        const uri = vscode.Uri.joinPath(documentURI, "../", src);
        const convertedUri = path.extname(src) === ".pdf" ? uri : panel.webview.asWebviewUri(uri);
        return convertedUri;
    } : undefined;

    const fragment = renderHTMLFragment(
        el,
        convertFigUri,
    );

    const initialCenterOffset = (
        (typeof options.initialCenterOffset === "number")
            ? options.initialCenterOffset
            : (typeof options.initialCenterOffset === "function")
                ? options.initialCenterOffset()
                : undefined
    );

    const html = /*html*/`\
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>${htmlCSS}</style>
</head>
<body>
${fragment}
<script>
(() => {    
    const vscode = acquireVsCodeApi();

    const initialCenterOffset = ${JSON.stringify(initialCenterOffset)};
    let stickingScrollTop = null;

    const throttle = (func, waitms) => {
        let timer;
        const lastArgsObj = {};
        return (...args) => {
            lastArgsObj.args = args;
            if (timer !== undefined) {
                return;
                // clearTimeout(timer);
            }
            timer = setTimeout(() => {
                func(...lastArgsObj.args);
                timer = undefined;
                lastArgsObj.args = undefined;
            }, waitms);
        };
    };
    
    const setCenterOffset = (offset) => {
        const rangeInfo = {
            start: {
                d: null,
                top: 0,
            },
            end: {
                d: null,
                top: null,
            },
        };
        for (const el of document.querySelectorAll("[data-lawtext_range]")) {
            const range = JSON.parse(el.dataset["lawtext_range"]);
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
                rangeInfo.end.top = startTop;
                rangeInfo.end.d = endD;
            }
        }
        if ((rangeInfo.start.d === null) || (rangeInfo.end.d === null)) return;
        const r = -rangeInfo.start.d / (rangeInfo.end.d - rangeInfo.start.d);
        const top = rangeInfo.start.top + r * (rangeInfo.end.top - rangeInfo.start.top);
        const scrollEL = document.querySelector("html");
        const scrollELRect = scrollEL.getBoundingClientRect();
        const newScrollTop = (top - scrollELRect.top) - window.innerHeight / 2;
        if (!Number.isFinite(newScrollTop)) return;
        listeningPostCenterOffset = false;
        scrollEL.scrollTop = newScrollTop;
        stickingScrollTop = newScrollTop;
        // console.log("setCenterOffset " + JSON.stringify({ offset, newScrollTop, rangeInfo }));
        setTimeout(() => {
            listeningPostCenterOffset = true;
        }, 300);
    };

    const visibleELs = new Set();

    let listeningPostCenterOffset = true;

    const postCenterOffset = () => {
        if (!listeningPostCenterOffset) return;
        const scrollEL = document.querySelector("html");
        if (Math.abs(scrollEL.scrollTop - stickingScrollTop) < 1) {
            console.log("scrollTop sticking: " + JSON.stringify({ scrollTop: scrollEL.scrollTop, stickingScrollTop }));
            return;
        }
        stickingScrollTop = null;
        const centerHeight = window.innerHeight / 2;
        const rangeInfo = {
            start: {
                offset: 0,
                y: null,
            },
            end: {
                offset: null,
                y: null,
            },
        }
        for (const el of visibleELs) {
            const range = JSON.parse(el.dataset["lawtext_range"]);
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
        if ((rangeInfo.start.y === null) || (rangeInfo.end.y === null)) return;
        const r = -rangeInfo.start.y / (rangeInfo.end.y - rangeInfo.start.y);
        const offset = Math.round(rangeInfo.start.offset + r * (rangeInfo.end.offset - rangeInfo.start.offset));
        if (!Number.isFinite(offset)) return;
        vscode.postMessage({
            command: "centerOffset",
            offset,
        });
        // console.log("postCenterOffset " + JSON.stringify({ rangeInfo, offset }));
    }

    const observerCallback = (entries, observer) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                visibleELs.add(entry.target);
            } else {
                visibleELs.delete(entry.target);
            }
        }
    };

    // main
    
    if (typeof initialCenterOffset === "number") setCenterOffset(initialCenterOffset);

    for (const a of document.querySelectorAll("a[href]")) {
        a.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            vscode.postMessage({
                command: "openLink",
                href: a.href,
            });
        });
    }
    
    const observer =  new IntersectionObserver(observerCallback);
    for (const el of document.querySelectorAll("[data-lawtext_range]")) {
        observer.observe(el);
    }
    const throttlePostCenterOffset = throttle(postCenterOffset, 100);
    window.addEventListener("resize", throttlePostCenterOffset);
    window.addEventListener("scroll", throttlePostCenterOffset);

    window.addEventListener("message", event => {
        setCenterOffset(event.data.offset);
    });

})();
</script>
</body>
</html>
`;

    panel.webview.onDidReceiveMessage(
        message => {
            if (message.command === "openLink") {
                const uri = vscode.Uri.parse(message.href);
                vscode.commands.executeCommand("vscode.open", uri);
            } else if (message.command === "centerOffset") {
                if (options.onCenterOffset) {
                    options.onCenterOffset(message.offset);
                }
            }
        },
        undefined,
        context.subscriptions
    );

    if (scrollEventTarget) {
        const scrollHandler = (e: {offset: number}) => {
            const { offset } = e;
            panel.webview.postMessage({
                command: "scroll",
                offset,
            });
        };
        scrollEventTarget.add(scrollHandler);
        context.subscriptions.push({
            dispose: () => {
                scrollEventTarget.remove(scrollHandler);
            }
        });
    }

    panel.webview.html = html;
};

export default previewEL;
