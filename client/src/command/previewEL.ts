import * as vscode from "vscode";
import * as renderer from "lawtext/dist/src/renderer";
import htmlCSS from "lawtext/dist/src/renderer/rules/htmlCSS";
import { EL } from "lawtext/dist/src/node/el";
import path from "path";
import { pictMimeDict } from "lawtext/dist/src/util";

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

export interface PreviewELOptions {
    context: vscode.ExtensionContext,
    el: EL,
    rawDocumentURI?: string,
    onCenterOffset?: (offset: number) => void,
    initialCenterOffset?: number | (() => number),
    panel?: vscode.WebviewPanel,
}

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
        return (...args) => {
            if (timer !== undefined) {
                return;
                // clearTimeout(timer);
            }
            timer = setTimeout(() => {
                func(...args);
                timer = undefined;
            }, waitms);
        };
    };
    
    const setCenterOffset = (offset) => {
        const rangeInfo = {
            start: {
                d: Number.MIN_SAFE_INTEGER,
                top: 0,
            },
            end: {
                d: Number.MAX_SAFE_INTEGER,
                top: Number.MAX_SAFE_INTEGER,
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
            if (startD <= 0 && rangeInfo.start.d < startD) {
                rangeInfo.start.top = startTop;
                rangeInfo.start.d = startD;
            }
            if (0 <= endD && endD < rangeInfo.end.d) {
                rangeInfo.end.top = startTop;
                rangeInfo.end.d = endD;
            }
        }
        const r = -rangeInfo.start.d / (rangeInfo.end.d - rangeInfo.start.d);
        const top = rangeInfo.start.top + r * (rangeInfo.end.top - rangeInfo.start.top);
        const scrollEL = document.querySelector("html");
        const scrollELRect = scrollEL.getBoundingClientRect();
        const newScrollTop = (top - scrollELRect.top) - window.innerHeight / 2;
        scrollEL.scrollTop = newScrollTop;
        stickingScrollTop = newScrollTop;
    };

    const visibleELs = new Set();

    const postCenterOffset = () => {
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
                y: Number.MIN_SAFE_INTEGER,
            },
            end: {
                offset: Number.MAX_SAFE_INTEGER,
                y: Number.MAX_SAFE_INTEGER,
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
            if (startY <= 0 && rangeInfo.start.y < startY) {
                rangeInfo.start.offset = startOffset;
                rangeInfo.start.y = startY;
            }
            if (0 <= endY && endY < rangeInfo.end.y) {
                rangeInfo.end.offset = endOffset;
                rangeInfo.end.y = endY;
            }
        }
        const r = -rangeInfo.start.y / (rangeInfo.end.y - rangeInfo.start.y);
        const offset = Math.round(rangeInfo.start.offset + r * (rangeInfo.end.offset - rangeInfo.start.offset));
        vscode.postMessage({
            command: "centerOffset",
            offset,
        });
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

    panel.webview.html = html;
};

export default previewEL;
