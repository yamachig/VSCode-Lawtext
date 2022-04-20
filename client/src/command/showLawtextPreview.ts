import * as vscode from "vscode";
import { parse } from "lawtext/dist/src/parser/lawtext";
import { analyze } from "lawtext/dist/src/analyzer";
import previewEL, { Broadcast } from "./previewEL";

export const showLawtextPreview = (context: vscode.ExtensionContext) => {
    const disposables: vscode.Disposable[] = [];
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

    const documentURI = editor.document.uri;

    const lawtext = editor.document.getText();
    const { value: el } = parse(lawtext);
    analyze(el);

    const centerOffset = () => (
        editor.document.offsetAt(editor.visibleRanges[0].start)
        + editor.document.offsetAt(editor.visibleRanges[0].end)
    ) / 2;

    let scrollCounter = 0;
    const onDidChangeTextEditorVisibleRanges = (e: vscode.TextEditorVisibleRangesChangeEvent) => {
        if (e.textEditor.document.uri.toString() !== documentURI.toString()) return;
        if (scrollCounter > 0) {
            scrollCounter--;
        } else {
            const offset = centerOffset();
            editorOffsetChangedEventTarget.broadcast({ offset });
        }
    };

    const onPreviewOffsetChanged = (offset: number) => {
        const position = editor.document.positionAt(offset);
        scrollCounter++;
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    };

    const editorOffsetChangedEventTarget = new Broadcast<{offset: number}>();

    setTimeout(() => {
        previewEL({
            context, el,
            rawDocumentURI: editor.document.uri.toString(),
            onPreviewOffsetChanged,
            initialCenterOffset: centerOffset,
            editorOffsetChangedEventTarget,
            panel,
        });

        disposables.push(vscode.window.onDidChangeTextEditorVisibleRanges(onDidChangeTextEditorVisibleRanges));
    }, 100);

    panel.onDidDispose(() => {
        disposables.forEach(d => d.dispose());
    });
};

export default showLawtextPreview;
