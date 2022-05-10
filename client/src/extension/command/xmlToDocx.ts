import xmlToEL from "lawtext/dist/src/node/el/xmlToEL";
import renderDocxAsync from "lawtext/dist/src/renderer/docx";

import * as vscode from "vscode";

export const xmlToDocx = async () => {
    const document = vscode.window.activeTextEditor?.document;
    if (!document) return;
    const reExt = /\.(?:(?:law\.)?txt|lawtext)$/;
    const defaultUri = (
        reExt.test(document.uri.path)
            ? document.uri.with({ path: document.uri.path.replace(/\.(?:(?:law\.)?txt|lawtext)$/, ".docx") })
            : undefined
    );
    const uri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { "Word document": ["docx"] },
    });
    if (!uri) return;
    const xml = document.getText();
    const law = xmlToEL(xml);
    const docx = await renderDocxAsync(law);
    vscode.workspace.fs.writeFile(uri, docx);
};

export default xmlToDocx;
