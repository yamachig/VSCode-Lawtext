import * as vscode from "vscode";
import showLawtextPreview from "./command/showLawtextPreview";
import previewEL from "./command/previewEL";
import { JsonEL, loadEl } from "lawtext/dist/src/node/el";


export const activate = (context: vscode.ExtensionContext) => {

    context.subscriptions.push(
        vscode.commands.registerCommand("extension.showLawtextPreview", () => showLawtextPreview(context))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("extension.previewEL", (jsonEL: JsonEL, rawDocumentURI: string) => {
            const el = loadEl(jsonEL);
            previewEL({ context, el, rawDocumentURI });
        })
    );

};


export const deactivate = (): Thenable<void> | undefined => {
    return undefined;
};


