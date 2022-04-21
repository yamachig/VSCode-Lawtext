import * as vscode from "vscode";

export const openURI = async () => {
    const uriString = await vscode.window.showInputBox({ placeHolder: "Enter URI to open" });
    if (!uriString) return;
    const uri = vscode.Uri.parse(uriString);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
};

export default openURI;
