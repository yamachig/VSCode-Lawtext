import * as vscode from "vscode";
import { parse } from "lawtext/dist/src/parser/lawtext";
import { analyze } from "lawtext/dist/src/analyzer";
import previewEL, { Broadcast } from "./previewEL";

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
    analyze(el);

    const centerOffset = () => (
        editor.document.offsetAt(editor.visibleRanges[0].start)
        + editor.document.offsetAt(editor.visibleRanges[0].end)
    ) / 2;

    let scrollCounter = 0;
    const onDidChangeTextEditorVisibleRanges = () => {
        if (scrollCounter > 0) {
            scrollCounter--;
        } else {
            const offset = centerOffset();
            scrollEventTarget.broadcast({ offset });
        }
    };

    const onCenterOffset = (offset: number) => {
        const position = editor.document.positionAt(offset);
        scrollCounter++;
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    };

    const scrollEventTarget = new Broadcast<{offset: number}>();

    setTimeout(() => {
        previewEL({
            context, el,
            rawDocumentURI: editor.document.uri.toString(),
            onCenterOffset,
            initialCenterOffset: centerOffset,
            scrollEventTarget,
            panel,
        });

        vscode.window.onDidChangeTextEditorVisibleRanges(onDidChangeTextEditorVisibleRanges, undefined, context.subscriptions);
    }, 100);
};

export default showLawtextPreview;
