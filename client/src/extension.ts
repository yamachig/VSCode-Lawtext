import * as vscode from "vscode";
import { parse } from "lawtext/dist/src/parser/lawtext";
import { analyze } from "lawtext/dist/src/analyzer";
import * as renderer from "lawtext/dist/src/renderer";
import htmlCSS from "lawtext/dist/src/renderer/rules/htmlCSS";
import { JsonEL } from "lawtext/dist/src/node/el";
import path from "path";
import { pictMimeDict } from "lawtext/dist/src/util";

const renderHTMLFragment = (el: JsonEL, convertFigUri?: (src: string) => vscode.Uri) => {
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
        });
    return fragment;
};

const previewJsonEL = (context: vscode.ExtensionContext, el: JsonEL, rawDocumentURI?: string) => {
    const panel = vscode.window.createWebviewPanel(
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
    document.querySelectorAll("a[href]").forEach(a => {
        a.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            vscode.postMessage({
                command: "openLink",
                href: a.href,
            });
        });
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
            }
        },
        undefined,
        context.subscriptions
    );

    panel.webview.html = html;
};

const showLawtextPreview = (context: vscode.ExtensionContext) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    if (editor.document.languageId !== "lawtext") return;
    const lawtext = editor.document.getText();
    const { value: law } = parse(lawtext);
    analyze(law);
    previewJsonEL(context, law, editor.document.uri.toString());
};

export const activate = (context: vscode.ExtensionContext) => {

    context.subscriptions.push(
        vscode.commands.registerCommand("extension.showLawtextPreview", () => showLawtextPreview(context))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("extension.previewJsonEL", (...args: [el: JsonEL, rawDocumentURI: string]) => previewJsonEL(context, ...args))
    );

};


export const deactivate = (): Thenable<void> | undefined => {
    return undefined;
};


