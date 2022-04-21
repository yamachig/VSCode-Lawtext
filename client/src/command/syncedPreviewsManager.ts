import * as vscode from "vscode";
import previewEL, { Broadcast } from "./previewEL";
import { parse } from "lawtext/dist/src/parser/lawtext";
import { analyze } from "lawtext/dist/src/analyzer";

const centerOffset = (documentURIStr: string) => {
    const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === documentURIStr);
    return editor && (
        editor.document.offsetAt(editor.visibleRanges[0].start)
        + editor.document.offsetAt(editor.visibleRanges[0].end)
    ) / 2;
};

interface PreviewState {
    panel: vscode.WebviewPanel,
    scrollCount: number,
    editorOffsetChangedEventTarget: Broadcast<{offset: number}>,
    syncEnabled: boolean,
}

class SyncedPreviewsManager extends vscode.Disposable {
    private disposables: Set<vscode.Disposable> = new Set();
    private states: Map<string, PreviewState> = new Map();

    constructor() {
        super(() => this.dispose());
        this.disposables.add(vscode.window.onDidChangeTextEditorVisibleRanges(this.onDidChangeTextEditorVisibleRanges.bind(this)));
    }

    public override dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables.clear();
        super.dispose();
    }

    public open(document: vscode.TextDocument) {
        const documentURIStr = document.uri.toString();
        const state = this.states.get(documentURIStr);
        if (state) {
            state.panel.reveal();
        } else {
            const lawtext = document.getText();
            const { value: el } = parse(lawtext);
            analyze(el);

            const panel = vscode.window.createWebviewPanel(
                "lawtextPreview",
                "Lawtext Preview",
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    enableFindWidget: true,
                },
            );
            panel.onDidDispose(() => {
                this.states.delete(documentURIStr);
            });

            const state: PreviewState = {
                panel,
                scrollCount: 0,
                editorOffsetChangedEventTarget: new Broadcast<{offset: number}>(),
                syncEnabled: false,
            };
            this.states.set(documentURIStr, state);

            setTimeout(() => {
                previewEL({
                    el,
                    rawDocumentURI: documentURIStr,
                    onPreviewOffsetChanged: (offset: number) => this.onPreviewOffsetChanged(documentURIStr, offset),
                    initialCenterOffset: () => centerOffset(documentURIStr) ?? 0,
                    editorOffsetChangedEventTarget: state.editorOffsetChangedEventTarget,
                    panel,
                });
                state.syncEnabled = true;
            }, 100);
        }
    }

    private onPreviewOffsetChanged(documentURIStr: string, offset: number) {
        const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === documentURIStr);
        if (!editor) return;
        const state = this.states.get(documentURIStr);
        if (!state) return;
        const position = editor.document.positionAt(offset);
        state.scrollCount++;
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    }

    private onDidChangeTextEditorVisibleRanges(e: vscode.TextEditorVisibleRangesChangeEvent) {
        const documentURIStr = e.textEditor.document.uri.toString();
        const state = this.states.get(documentURIStr);
        if (!state) return;
        if (state.scrollCount > 0) {
            state.scrollCount--;
        } else {
            if (state.syncEnabled) {
                const offset = centerOffset(documentURIStr);
                if (typeof offset === "number") {
                    state.editorOffsetChangedEventTarget.broadcast({ offset });
                }
            }
        }
    }
}

const syncedPreviewsManager = new SyncedPreviewsManager();

export default syncedPreviewsManager;


