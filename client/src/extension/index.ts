import * as vscode from "vscode";
import previewEL from "./command/previewEL.ts";
import loaderContentProvider, { lawtextScheme } from "./loaderContentProvider.ts";
import openURI from "./command/openURI.ts";
import openFromElaws from "./command/openFromElaws.ts";
import showLawtextPreview from "./command/showLawtextPreview.ts";
import toXML from "./command/toXML.ts";
import xmlToLawtext from "./command/xmlToLawtext.ts";
import toDocx from "./command/toDocx.ts";
import xmlToDocx from "./command/xmlToDocx.ts";

export const activate = (context: vscode.ExtensionContext) => {

    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(lawtextScheme, loaderContentProvider));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.openURI", openURI));

    context.subscriptions.push(vscode.commands.registerCommand("lawtext.openFromElaws", openFromElaws));

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


