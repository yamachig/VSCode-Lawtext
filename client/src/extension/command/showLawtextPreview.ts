import * as vscode from "vscode";
import syncedPreviewsManager from "../syncedPreviewsManager";

export const showLawtextPreview = () => {
    const document = vscode.window.activeTextEditor?.document;
    if (!document) return;
    syncedPreviewsManager.open(document);
};

export default showLawtextPreview;

