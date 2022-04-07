import * as vscode from "vscode";
import * as fs from "fs";
import { parse } from "lawtext/dist/src/parser/lawtext";
import * as renderer from "lawtext/dist/src/renderer";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from "vscode-languageclient/node";
import path = require("path");

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

let client: LanguageClient;

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

    const serverModule = context.asAbsolutePath(
        path.join("server", "out", "server.js")
    );

    const debugOptions = { execArgv: ["--nolazy", "--inspect=6000"] };

    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "lawtext" }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc")
        }
    };

    client = new LanguageClient(
        "lawtextLanguageServe",
        "Lawtext Language Server",
        serverOptions,
        clientOptions
    );

    client.start();
};


export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
