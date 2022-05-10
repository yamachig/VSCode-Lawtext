import xmlToEL from "lawtext/dist/src/node/el/xmlToEL";
import renderLawtext from "lawtext/dist/src/renderer/lawtext";

import * as vscode from "vscode";

export const xmlToLawtext = async () => {
    const document = vscode.window.activeTextEditor?.document;
    if (!document) return;
    const xml = document.getText();
    const law = xmlToEL(xml);
    const lawtext = renderLawtext(law);
    const lawtextDocument = await vscode.workspace.openTextDocument({
        language: "lawtext",
        content: lawtext,
    });
    await vscode.window.showTextDocument(lawtextDocument);
};

export default xmlToLawtext;
