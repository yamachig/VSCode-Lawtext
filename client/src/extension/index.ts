import * as vscode from "vscode";
import previewEL from "./command/previewEL";
import loaderContentProvider, { lawtextScheme } from "./loaderContentProvider";
import openURI from "./command/openURI";
import showLawtextPreview from "./command/showLawtextPreview";
import toXML from "./command/toXML";
import xmlToLawtext from "./command/xmlToLawtext";
import toDocx from "./command/toDocx";
import xmlToDocx from "./command/xmlToDocx";

export const activate = (context: vscode.ExtensionContext) => {

    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(lawtextScheme, loaderContentProvider));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.openURI", openURI));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.showLawtextPreview", showLawtextPreview));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.previewEL", previewEL));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.toXML", toXML));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.toDocx", toDocx));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.xmlToLawtext", xmlToLawtext));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.xmlToDocx", xmlToDocx));

};


export const deactivate = (): Thenable<void> | undefined => {
    return undefined;
};


