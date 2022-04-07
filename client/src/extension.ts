import * as vscode from "vscode";
import * as fs from "fs";
import { parse } from "lawtext/dist/src/parser/lawtext";
import * as renderer from "lawtext/dist/src/renderer";
import path from "path";

const renderActiveEditor = (context: vscode.ExtensionContext) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return "error";
    if (!(editor.document.languageId === "lawtext")) {
        return "Active editor doesn't show a Lawtext document.";
    }
    const lawtext = editor.document.getText();
    const { value: law } = parse(lawtext);
    const cssFile = context.asAbsolutePath(
        path.join("client", "src", "static", "law.css")
    );
    const rendered = renderer.renderHtml(
        law,
        {
            style: [
                fs.readFileSync(cssFile, { encoding: "utf-8" }),
                "body { background-color: white; color: black; }"
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
};


export const deactivate = (): Thenable<void> | undefined => {
    return undefined;
};


