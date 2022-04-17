import * as vscode from "vscode";
import { parse } from "lawtext/dist/src/parser/lawtext";
import { analyze } from "lawtext/dist/src/analyzer";
import * as renderer from "lawtext/dist/src/renderer";
import { isJsonEL, JsonEL } from "lawtext/dist/src/node/el";
import path from "path";
import { pictMimeDict } from "lawtext/dist/src/util";

const renderHTML = (rawDocumentURI: string, el: JsonEL, convertUri?: (uri: vscode.Uri) => vscode.Uri) => {
    const getFigData = (src: string) => {
        const documentURI = vscode.Uri.parse(rawDocumentURI);
        const uri = vscode.Uri.joinPath(documentURI, "../", src);
        const convertedUri = convertUri ? convertUri(uri) : uri;
        const ext = path.extname(src) as keyof typeof pictMimeDict;
        const type = ext in pictMimeDict ? pictMimeDict[ext] : "application/octet-stream";
        return { url: convertedUri.toString(), type };
    };
    return renderer.renderHTML(
        el,
        {
            renderControlEL: true,
            getFigData,
        });
};

const renderActiveEditor = (context: vscode.ExtensionContext, convertUri?: (uri: vscode.Uri) => vscode.Uri) => {
    void context;
    const editor = vscode.window.activeTextEditor;
    if (!editor) return "error";
    if (!(editor.document.languageId === "lawtext")) {
        return "Active editor doesn't show a Lawtext document.";
    }
    const lawtext = editor.document.getText();
    const { value: law } = parse(lawtext);
    analyze(law);
    const rendered = renderHTML(editor.document.uri.toString(), law, convertUri);
    return rendered;
};

export const activate = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(
        vscode.commands.registerCommand("extension.showLawtextPreview", () => {
            const panel = vscode.window.createWebviewPanel(
                "lawtextPreview",
                "Lawtext Preview",
                vscode.ViewColumn.Two,
                {},
            );

            panel.webview.html = renderActiveEditor(context, uri => panel.webview.asWebviewUri(uri));
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("extension.previewJsonEL", (jsonEL: JsonEL, documentURI: string) => {
            if (isJsonEL(jsonEL)) {
                const panel = vscode.window.createWebviewPanel(
                    "lawtextPreview",
                    "Lawtext Preview",
                    vscode.ViewColumn.Two,
                    {},
                );
                panel.webview.asWebviewUri;

                panel.webview.html = renderHTML(documentURI, jsonEL, uri => panel.webview.asWebviewUri(uri));
            }
        })
    );
};


export const deactivate = (): Thenable<void> | undefined => {
    return undefined;
};


