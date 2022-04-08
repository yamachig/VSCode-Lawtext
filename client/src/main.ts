import * as vscode from "vscode";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from "vscode-languageclient/node";
import * as path from "path";
import * as extension from "./extension";

let client: LanguageClient;

export const activate = (context: vscode.ExtensionContext) => {
    extension.activate(context);

    const serverModule = context.asAbsolutePath(
        path.join("server", "out", "main.js")
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
        documentSelector: [{ language: "lawtext" }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc")
        },
    };

    client = new LanguageClient(
        "lawtextLanguageServer",
        "Lawtext Language Server",
        serverOptions,
        clientOptions
    );

    client.start();
};


export const deactivate = async () => {
    await extension.deactivate();
    if (!client) {
        return undefined;
    }
    return client.stop();
};
