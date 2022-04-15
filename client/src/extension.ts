import * as vscode from "vscode";
import { parse } from "lawtext/dist/src/parser/lawtext";
import * as renderer from "lawtext/dist/src/renderer";
import { isJsonEL, JsonEL } from "lawtext/dist/src/node/el";

const renderActiveEditor = (context: vscode.ExtensionContext) => {
    void context;
    const editor = vscode.window.activeTextEditor;
    if (!editor) return "error";
    if (!(editor.document.languageId === "lawtext")) {
        return "Active editor doesn't show a Lawtext document.";
    }
    const lawtext = editor.document.getText();
    const { value: law } = parse(lawtext);
    const rendered = renderer.renderHTML(law);
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

            panel.webview.html = renderActiveEditor(context);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("extension.previewJsonEL", (jsonEL: JsonEL) => {
            if (isJsonEL(jsonEL)) {
                const panel = vscode.window.createWebviewPanel(
                    "lawtextPreview",
                    "Lawtext Preview",
                    vscode.ViewColumn.Two,
                    {},
                );

                panel.webview.html = renderer.renderHTML(jsonEL);
            }
        })
    );
};


export const deactivate = (): Thenable<void> | undefined => {
    return undefined;
};


