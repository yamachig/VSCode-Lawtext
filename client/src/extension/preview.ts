import * as vscode from "vscode";
import htmlCSS from "lawtext/dist/src/renderer/rules/htmlCSS";
import { EL } from "lawtext/dist/src/node/el";
import { loadEL } from "lawtext/dist/src/node/el/loadEL";
import * as std from "lawtext/dist/src/law/std";
import path from "path";
import { pictMimeDict } from "lawtext/dist/src/util";
import previewerScript from "../previewer/out/bundle.js.txt";
import type { PreviewerOptions } from "../previewer/src/optionsInterface";
import loaderContentProvider from "./loaderContentProvider";
import type { JsonEL } from "lawtext/dist/src/node/el/jsonEL";

const previewerHTML = /*html*/`\
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
</script>
<script src="data:text/javascript;base64,${Buffer.from(previewerScript).toString("base64")}"></script>
</body>
</html>
`;

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
    el: EL | JsonEL,
    onPreviewOffsetChanged?: (offset: number) => void,
    editorOffsetChangedEventTarget?: Broadcast<{offset: number}>,
    initialCenterOffset?: number | (() => number),
    panel?: vscode.WebviewPanel,
    figDataMap?: Record<string, {url: string, type: string}>,
}

export const getFigDataMapWithDocument = (el: EL | string, documentURIStr: string) => {
    const figDataMap: Record<string, {url: string, type: string}> = {};
    const pictURLCache = loaderContentProvider.pictURLCache.get(documentURIStr);
    if (pictURLCache) {
        for (const [key, value] of pictURLCache) {
            figDataMap[key] = value;
        }
    } else {
        const convertFigSrc = (src: string) => {
            const documentURI = vscode.Uri.parse(documentURIStr);
            const uri = vscode.Uri.joinPath(documentURI, "../", src);
            return uri.toString();
        };
        Object.assign(figDataMap, _getFigDataMap(el, convertFigSrc));
    }
    return figDataMap;
};

const _getFigDataMap = (el: EL | string, convertFigSrc: (src: string) => string) => {
    const figDataMap: Record<string, {url: string, type: string}> = {};
    if (typeof el === "string") return figDataMap;
    if (std.isFig(el)) {
        const src = el.attr.src;
        const ext = path.extname(src) as keyof typeof pictMimeDict;
        const type = ext in pictMimeDict ? pictMimeDict[ext] : "application/octet-stream";
        figDataMap[src] = { url: convertFigSrc(src), type };
    }
    for (const child of el.children) {
        Object.assign(figDataMap, _getFigDataMap(child, convertFigSrc));
    }
    return figDataMap;
};

export const preview = async (options: PreviewELOptions) => {
    const disposables: Set<vscode.Disposable> = new Set();

    const { el: elOrJsonEL, editorOffsetChangedEventTarget } = options;

    const el = elOrJsonEL instanceof EL ? elOrJsonEL : loadEL(elOrJsonEL);

    const panel = options.panel ?? vscode.window.createWebviewPanel(
        "lawtextPreview",
        "Lawtext Preview",
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
            enableFindWidget: true,
        },
    );
    panel.onDidDispose(() => {
        disposables.forEach(d => d.dispose());
        disposables.clear();
    });

    panel.webview.html = previewerHTML;

    const els = [el.json(true, true)];

    const figDataMap: Record<string, {url: string, type: string}> = {};
    for (const [src, { url: uriString, type }] of Object.entries(options.figDataMap ?? {})) {
        const uri = vscode.Uri.parse(uriString);
        let convertedURI: string;
        if (uri.scheme === "file") {
            convertedURI = type === "application/pdf" ? uriString : panel.webview.asWebviewUri(uri).toString();
        } else {
            convertedURI = uriString;
        }
        figDataMap[src] = { url: convertedURI.toString(), type };
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

    disposables.add(panel.webview.onDidReceiveMessage(
        message => {
            if (message.command === "openLink") {
                const uri = vscode.Uri.parse(message.href);
                vscode.commands.executeCommand("vscode.open", uri);
            } else if (message.command === "centerOffsetChanged") {
                if (options.onPreviewOffsetChanged) {
                    options.onPreviewOffsetChanged(message.offset);
                }
            }
        }
    ));

    if (editorOffsetChangedEventTarget) {
        const scrollHandler = (e: {offset: number}) => {
            const { offset } = e;
            panel.webview.postMessage({
                command: "scrollToOffset",
                offset,
            });
        };
        editorOffsetChangedEventTarget.add(scrollHandler);
        disposables.add({
            dispose: () => {
                editorOffsetChangedEventTarget.remove(scrollHandler);
            }
        });
    }
};

export default preview;
