import { parse } from "lawtext/dist/src/parser/lawtext";
import renderDocxAsync from "lawtext/dist/src/renderer/docx";

import * as vscode from "vscode";

export const toDocx = async () => {
    const document = vscode.window.activeTextEditor?.document;
    if (!document) return;
    const uri = await vscode.window.showSaveDialog({
        defaultUri: document.uri.with({ path: document.uri.path.replace(/\.(?:(?:law\.)?txt|lawtext)$/, ".docx") }),
        filters: { "Word document": ["docx"] },
    });
    if (!uri) return;
    const lawtext = document.getText();
    const { value: law } = parse(lawtext);
    const docx = await renderDocxAsync(law);
    vscode.workspace.fs.writeFile(uri, docx);
};

export default toDocx;
