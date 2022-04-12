import * as vscode from "vscode";
import { parse } from "lawtext/dist/src/parser/lawtext";
import * as renderer from "lawtext/dist/src/renderer";
import { isJsonEL, JsonEL } from "lawtext/dist/src/node/el";

import lawCSS from "./static/law.css";

const renderActiveEditor = (context: vscode.ExtensionContext) => {
    void context;
    const editor = vscode.window.activeTextEditor;
    if (!editor) return "error";
    if (!(editor.document.languageId === "lawtext")) {
        return "Active editor doesn't show a Lawtext document.";
    }
    const lawtext = editor.document.getText();
    const { value: law } = parse(lawtext);
    const rendered = renderer.renderHtml(
        law,
        {
            style: [
                lawCSS,
                "body { background-color: white; color: black; padding: 0.5em; }"
            ].join("\n"),
        }
    );
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

                panel.webview.html = renderer.renderHtml(
                    jsonEL,
                    {
                        style: [
                            lawCSS,
                            "body { background-color: white; color: black; padding: 0.5em; }"
                        ].join("\n"),
                    },
                );
            }
        })
    );
};


export const deactivate = (): Thenable<void> | undefined => {
    return undefined;
};


