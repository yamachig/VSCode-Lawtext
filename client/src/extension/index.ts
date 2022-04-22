import * as vscode from "vscode";
import previewEL from "./command/previewEL";
import loaderContentProvider, { lawtextScheme } from "./loaderContentProvider";
import openURI from "./command/openURI";
import showLawtextPreview from "./command/showLawtextPreview";

export const activate = (context: vscode.ExtensionContext) => {

    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(lawtextScheme, loaderContentProvider));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.openURI", openURI));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.showLawtextPreview", showLawtextPreview));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.previewEL", previewEL)); // TODO

};


export const deactivate = (): Thenable<void> | undefined => {
    return undefined;
};


