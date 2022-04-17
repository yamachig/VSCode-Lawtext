import * as vscode from "vscode";
import { parse } from "lawtext/dist/src/parser/lawtext";
import { analyze } from "lawtext/dist/src/analyzer";
import previewJsonEL from "./previewJsonEL";

export const showLawtextPreview = (context: vscode.ExtensionContext) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    if (editor.document.languageId !== "lawtext") return;
    const lawtext = editor.document.getText();
    const { value: law } = parse(lawtext);
    analyze(law);
    previewJsonEL(context, law, editor.document.uri.toString());
};

export default showLawtextPreview;
