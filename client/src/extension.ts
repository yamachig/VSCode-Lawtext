import * as vscode from "vscode";
import previewEL from "./command/previewEL";
import { JsonEL, loadEl } from "lawtext/dist/src/node/el";
import syncedPreviewsManager from "./command/syncedPreviewsManager";

export const activate = (context: vscode.ExtensionContext) => {

    context.subscriptions.push(
        vscode.commands.registerCommand("extension.showLawtextPreview", () => {
            const document = vscode.window.activeTextEditor?.document;
            if (!document) return;
            syncedPreviewsManager.open(document);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("extension.previewEL", (jsonEL: JsonEL, rawDocumentURI: string) => {
            const el = loadEl(jsonEL);
            previewEL({ el, rawDocumentURI });
        })
    );

};


export const deactivate = (): Thenable<void> | undefined => {
    return undefined;
};


