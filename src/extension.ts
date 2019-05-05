import * as vscode from 'vscode';
import * as fs from "fs";
import { parse } from "lawtext/dist/parser_wrapper";
import * as renderer from "lawtext/dist/renderer";


const renderActiveEditor = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return "error";
    if (!(editor.document.languageId === 'lawtext')) {
        return "Active editor doesn't show a Lawtext document.";
    }
    const lawtext = editor.document.getText();
    const law = parse(lawtext);
    const rendered = renderer.renderHtml(
        law,
        {
            style: [
                fs.readFileSync(__dirname + '/../src/static/law.css', { encoding: "utf-8" }),
                "body { background-color: white; color: black; }"
            ].join("\n"),
        }
    );
    return rendered;
};

export const activate = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.showLawtextPreview', () => {
            const panel = vscode.window.createWebviewPanel(
                'lawtextPreview',
                'Lawtext Preview',
                vscode.ViewColumn.Two,
                {},
            );

            panel.webview.html = renderActiveEditor();
        })
    );
}