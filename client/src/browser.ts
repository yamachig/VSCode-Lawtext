import * as vscode from "vscode";
import type { LanguageClientOptions } from "vscode-languageclient";

import { LanguageClient } from "vscode-languageclient/browser";
import * as extension from "./extension";

let client: LanguageClient;

export const activate = (context: vscode.ExtensionContext) => {
    extension.activate(context);

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ language: "lawtext" }],
        synchronize: {},
        initializationOptions: {}
    };

    const serverMain = vscode.Uri.joinPath(context.extensionUri, "server/out-browser/bundle.js");
    console.log(serverMain);
    const worker = new Worker(serverMain.toString());
    client = new LanguageClient(
        "lawtextLanguageServerBrowser",
        "Lawtext Language Server (browser)",
        clientOptions,
        worker
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
