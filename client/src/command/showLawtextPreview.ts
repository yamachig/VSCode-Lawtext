import * as vscode from "vscode";
import { parse } from "lawtext/dist/src/parser/lawtext";
import { analyze } from "lawtext/dist/src/analyzer";
import previewEL from "./previewEL";

export const showLawtextPreview = (context: vscode.ExtensionContext) => {
    const panel = vscode.window.createWebviewPanel(
        "lawtextPreview",
        "Lawtext Preview",
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
            enableFindWidget: true,
        },
    );

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    if (editor.document.languageId !== "lawtext") return;
    const lawtext = editor.document.getText();
    const { value: el } = parse(lawtext);
    const onCenterOffset = (offset: number) => {
        const position = editor.document.positionAt(offset);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    };
    analyze(el);

    setTimeout(() => {
        const initialCenterOffset = (
            editor.document.offsetAt(editor.visibleRanges[0].start)
            + editor.document.offsetAt(editor.visibleRanges[0].end)
        ) / 2;
        previewEL({
            context, el,
            rawDocumentURI: editor.document.uri.toString(),
            onCenterOffset,
            initialCenterOffset,
            panel,
        });
    }, 100);
};

export default showLawtextPreview;
