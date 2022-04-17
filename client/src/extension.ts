import * as vscode from "vscode";
import { JsonEL } from "lawtext/dist/src/node/el";
import showLawtextPreview from "./command/showLawtextPreview";
import previewJsonEL from "./command/previewJsonEL";


export const activate = (context: vscode.ExtensionContext) => {

    context.subscriptions.push(
        vscode.commands.registerCommand("extension.showLawtextPreview", () => showLawtextPreview(context))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("extension.previewJsonEL", (...args: [el: JsonEL, rawDocumentURI: string]) => previewJsonEL(context, ...args))
    );

};


export const deactivate = (): Thenable<void> | undefined => {
    return undefined;
};


