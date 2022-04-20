import * as vscode from "vscode";
import { parse } from "lawtext/dist/src/parser/lawtext";
import { analyze } from "lawtext/dist/src/analyzer";
import previewEL, { Broadcast } from "./previewEL";


const centerOffset = (editor: vscode.TextEditor) => (
    editor.document.offsetAt(editor.visibleRanges[0].start)
    + editor.document.offsetAt(editor.visibleRanges[0].end)
) / 2;

const scrollCounter: Record<string, number> = {};

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

    const initialEditor = vscode.window.activeTextEditor;
    if (!initialEditor) return;
    if (initialEditor.document.languageId !== "lawtext") return;

    const documentURI = initialEditor.document.uri;
    const documentURIStr = documentURI.toString();
    scrollCounter[documentURIStr] = 0;

    const lawtext = initialEditor.document.getText();
    const { value: el } = parse(lawtext);
    analyze(el);

    const onDidChangeTextEditorVisibleRanges = (e: vscode.TextEditorVisibleRangesChangeEvent) => {
        console.log("onDidChangeTextEditorVisibleRanges");
        if (e.textEditor.document.uri.toString() !== documentURIStr) return;
        if (scrollCounter[documentURIStr] > 0) {
            scrollCounter[documentURIStr]--;
        } else {
            const offset = centerOffset(e.textEditor);
            editorOffsetChangedEventTarget.broadcast({ offset });
        }
    };

    const onPreviewOffsetChanged = (offset: number) => {
        const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === documentURIStr);
        if (editor) {
            const position = editor.document.positionAt(offset);
            scrollCounter[documentURIStr]++;
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
    };

    const editorOffsetChangedEventTarget = new Broadcast<{offset: number}>();

    setTimeout(() => {
        previewEL({
            context, el,
            rawDocumentURI: initialEditor.document.uri.toString(),
            onPreviewOffsetChanged,
            initialCenterOffset: () => centerOffset(initialEditor),
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
