import * as vscode from "vscode";
import preview, { Broadcast, getFigDataMapWithDocument } from "./preview";
import { parse } from "lawtext/dist/src/parser/lawtext";
import { analyze } from "lawtext/dist/src/analyzer";
import type { PreviewerOptions } from "../previewer/src/optionsInterface";
import { throttle } from "lawtext/dist/src/util";

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
    updateELs: (document: vscode.TextDocument) => void,
}

class SyncedPreviewsManager extends vscode.Disposable {
    private disposables: Set<vscode.Disposable> = new Set();
    private states: Map<string, PreviewState> = new Map();

    constructor() {
        super(() => this.dispose());
        this.disposables.add(vscode.window.onDidChangeTextEditorVisibleRanges(this.onDidChangeTextEditorVisibleRanges.bind(this)));
        this.disposables.add(vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this)));
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

            const updateELs = throttle((document: vscode.TextDocument) => {
                const lawtext = document.getText();
                const { value: el } = parse(lawtext);
                analyze(el);

                const previewerOptions: PreviewerOptions = {
                    els: [el.json(true, true)],
                };

                state.panel.webview.postMessage({
                    command: "setOptions",
                    options: previewerOptions,
                });
            }, 300);

            const state: PreviewState = {
                panel,
                scrollCount: 0,
                editorOffsetChangedEventTarget: new Broadcast<{offset: number}>(),
                syncEnabled: false,
                updateELs,
            };
            this.states.set(documentURIStr, state);

            setTimeout(() => {
                preview(
                    {
                        el,
                        onPreviewOffsetChanged: (offset: number) => this.onPreviewOffsetChanged(documentURIStr, offset),
                        initialCenterOffset: () => centerOffset(documentURIStr) ?? 0,
                        editorOffsetChangedEventTarget: state.editorOffsetChangedEventTarget,
                        panel,
                        figDataMap: getFigDataMapWithDocument(el, documentURIStr),
                    },
                );
                state.syncEnabled = true;

                setTimeout(() => {
                    updateELs(document);
                }, 300);
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

    private onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
        const documentURIStr = e.document.uri.toString();
        const state = this.states.get(documentURIStr);
        if (!state) return;
        state.updateELs(e.document);
    }
}

const syncedPreviewsManager = new SyncedPreviewsManager();

export default syncedPreviewsManager;


