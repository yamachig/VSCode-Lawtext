import { parse } from "lawtext/dist/src/parser/lawtext";
import renderXML from "lawtext/dist/src/renderer/xml";

import * as vscode from "vscode";

export const toXML = async () => {
    const document = vscode.window.activeTextEditor?.document;
    if (!document) return;
    const lawtext = document.getText();
    const { value: law } = parse(lawtext);
    const xml = renderXML(law, false, true);
    const xmlDocument = await vscode.workspace.openTextDocument({
        language: "xml",
        content: xml,
    });
    await vscode.window.showTextDocument(xmlDocument);
};

export default toXML;
