import {
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    InitializeResult,
    _Connection,
    SemanticTokensRegistrationType,
    SemanticTokensBuilder,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { parse } from "lawtext/dist/src/parser/lawtext";
import { LineType } from "lawtext/dist/src/node/cst/line";
import { VirtualOnlyLineType } from "lawtext/dist/src/parser/std/virtualLine";
import { assertNever } from "lawtext/dist/src/util";
import { isAppdxItemTitle, isArithFormulaNum, isArticleCaption, isArticleGroupTitle, isArticleRange, isArticleTitle, isControl, isNoteLikeStructTitle, isParagraphCaption, isParagraphItemTitle, isRelatedArticleNum, isRemarksLabel, isSupplProvisionAppdxItemTitle, isSupplProvisionLabel, isTableStructTitle, isTOCLabel, StdEL, __EL } from "lawtext/dist/src/law/std";

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasSemanticTokensCapability = false;

interface ExampleSettings {
    maxNumberOfProblems: number;
}

const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();
const tokenBuilders: Map<string, SemanticTokensBuilder> = new Map();

const tokenTypes: string[] = [];
const tokenModifiers: string[] = [];

export const main = (connection: _Connection) => {

    connection.onInitialize((params: InitializeParams) => {
        const capabilities = params.capabilities;

        hasConfigurationCapability = !!(
            capabilities.workspace && !!capabilities.workspace.configuration
        );
        hasWorkspaceFolderCapability = !!(
            capabilities.workspace && !!capabilities.workspace.workspaceFolders
        );
        const semanticTokensClientCapability = capabilities.textDocument?.semanticTokens;
        hasSemanticTokensCapability = !!semanticTokensClientCapability;

        if (semanticTokensClientCapability) {
            tokenTypes.push(...semanticTokensClientCapability.tokenTypes);
            tokenModifiers.push(...semanticTokensClientCapability.tokenModifiers);
        }

        const result: InitializeResult = {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Incremental,
            }
        };
        if (hasWorkspaceFolderCapability) {
            result.capabilities.workspace = {
                workspaceFolders: {
                    supported: true
                }
            };
        }
        return result;
    });

    connection.onInitialized(() => {
        if (hasConfigurationCapability) {
            connection.client.register(DidChangeConfigurationNotification.type, undefined);
        }
        if (hasSemanticTokensCapability) {
            console.log(`registering semantic tokens:
tokenTypes: ${JSON.stringify(Object.fromEntries(tokenTypes.entries()))}
tokenModifiers: ${JSON.stringify(Object.fromEntries(tokenModifiers.entries()))}
`);
            connection.client.register(SemanticTokensRegistrationType.type, {
                documentSelector: [{ language: "lawtext" }],
                legend: { tokenTypes, tokenModifiers },
                range: false,
                full: {
                    delta: true
                }
            });
        }
        if (hasWorkspaceFolderCapability) {
            connection.workspace.onDidChangeWorkspaceFolders(() => {
                connection.console.log("Workspace folder change event received.");
            });
        }
    });

    connection.onDidChangeConfiguration(() => {
        if (hasConfigurationCapability) {
            documentSettings.clear();
        }

        documents.all().forEach(validate);
    });

    documents.onDidClose(e => {
        documentSettings.delete(e.document.uri);
        tokenBuilders.delete(e.document.uri);
    });

    documents.onDidChangeContent(change => {
        validate(change.document);
    });

    const validate = async (textDocument: TextDocument): Promise<void> => {
        const lawtext = textDocument.getText();
        const { errors } = parse(lawtext);

        const diagnostics: Diagnostic[] = [];
        for (const error of errors) {
            const diagnostic: Diagnostic = {
                severity: DiagnosticSeverity.Error,
                range: {
                    start: textDocument.positionAt(error.location[0].offset),
                    end: textDocument.positionAt(error.location[1].offset),
                },
                message: error.message,
                source: "Lawtext"
            };
            diagnostics.push(diagnostic);
        }

        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    };

    connection.onDidChangeWatchedFiles(() => {
        connection.console.log("We received an file change event");
    });

    connection.languages.semanticTokens.on((params) => {
        console.dir({ method: "connection.languages.semanticTokens.on", params });
        const document = documents.get(params.textDocument.uri);
        if (document === undefined) {
            return { data: [] };
        }
        const builder = tokenBuilders.get(document.uri) ?? new SemanticTokensBuilder();
        if (!tokenBuilders.has(document.uri)) tokenBuilders.set(document.uri, builder);
        const builderItems: BuilderItem[] = [
            ...buildSampleTokens(document),
            ...buildTokens(document),
        ];
        builderItems.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
        for (const item of builderItems) {
            builder.push(...item);
        }
        return builder.build();
    });

    connection.languages.semanticTokens.onDelta((params) => {
        console.dir({ method: "connection.languages.semanticTokens.onDelta", params });
        const document = documents.get(params.textDocument.uri);
        if (document === undefined) {
            return { edits: [] };
        }
        const builder = tokenBuilders.get(document.uri) ?? new SemanticTokensBuilder();
        if (!tokenBuilders.has(document.uri)) tokenBuilders.set(document.uri, builder);
        builder.previousResult(params.previousResultId);
        const builderItems: BuilderItem[] = [
            ...buildSampleTokens(document),
            ...buildTokens(document),
        ];
        builderItems.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
        for (const item of builderItems) {
            builder.push(...item);
        }
        return builder.buildEdits();
    });

    connection.languages.semanticTokens.onRange((params) => {
        console.dir({ method: "connection.languages.semanticTokens.onRange", params });
        return { data: [] };
    });

    documents.listen(connection);

    connection.listen();

};

type BuilderItem = [line: number, char: number, length: number, tokenType: number, tokenModifiers: number];

function *buildSampleTokens(document: TextDocument) {
    const text = document.getText();
    const regexp = /\{(\S+?)\}/g;
    for (const m of text.matchAll(regexp)) {
        if (!m.index) continue;
        const ids = m[1].split(",");
        const position = document.positionAt(m.index);
        const tokenType = tokenTypes.findIndex(t => ids.indexOf(t) >= 0);
        const tokenModifier = tokenModifiers.findIndex(t => ids.indexOf(t) >= 0);
        yield [
            position.line,
            position.character,
            m[0].length,
            tokenType,
            (tokenModifier >= 0) ? (1 << tokenModifier) : 0,
        ] as BuilderItem;
    }
}

function *rangesOfEL(el: StdEL | __EL | string): Iterable<[[number, number], string]> {
    if (typeof el === "string") return;
    if (isControl(el)) {
        if (el.tag === "__PContent") {
            if (el.attr.type === "square") {
                if (el.range) yield [el.range, "string"];
            }
        }
    } else if (isArticleGroupTitle(el) || isSupplProvisionLabel(el) || isArticleRange(el) || isTOCLabel(el)) {
        if (el.range) yield [el.range, "namespace"];
    } else if (isArticleTitle(el) || isArticleCaption(el) || isParagraphItemTitle(el) || isParagraphCaption(el) || isAppdxItemTitle(el) || isSupplProvisionAppdxItemTitle(el) || isRelatedArticleNum(el) || isRemarksLabel(el) || isNoteLikeStructTitle(el) || isTableStructTitle(el) || isArithFormulaNum(el)) {
        if (el.range) yield [el.range, "enumMember"];
    }
    for (const child of el.children) {
        yield *rangesOfEL(child as StdEL | __EL | string);
    }
}


function *buildTokens(document: TextDocument) {
    const lawtext = document.getText();
    const { virtualLines, value: law } = parse(lawtext);

    const ranges: [[number, number], string][] = [];

    ranges.push(...rangesOfEL(law));

    for (const vl of virtualLines) {
        if (vl.type === LineType.BNK || vl.type === VirtualOnlyLineType.IND || vl.type === VirtualOnlyLineType.DED) {
            /**/
        } else if (vl.type === LineType.TOC) {
            // {
            //     const range = vl.line.contentRange;
            //     if (range) ranges.push([range, "typeParameter"]);
            // }
        } else if (vl.type === VirtualOnlyLineType.TAG) {
            // {
            //     const range = vl.line.contentRange;
            //     if (range) ranges.push([range, "typeParameter"]);
            // }
            {
                const range = vl.line.controlsRange;
                if (range) ranges.push([range, "macro"]);
            }
        } else if (vl.type === VirtualOnlyLineType.TSP) {
            // {
            //     const range = vl.line.headRange;
            //     if (range) ranges.push([range, "typeParameter"]);
            // }
            {
                const range = vl.line.controlsRange;
                if (range) ranges.push([range, "macro"]);
            }
        } else if (vl.type === LineType.ARG) {
            // {
            //     const range = vl.line.contentRange;
            //     if (range) ranges.push([range, "number"]);
            // }
            {
                const range = vl.line.controlsRange;
                if (range) ranges.push([range, "macro"]);
            }
        } else if (vl.type === LineType.SPR) {
            // {
            //     const range = vl.line.headRange;
            //     if (range) ranges.push([range, "number"]);
            // }
            {
                const range = vl.line.controlsRange;
                if (range) ranges.push([range, "macro"]);
            }
        } else if (vl.type === LineType.ART) {
            // {
            //     const range = vl.line.titleRange;
            //     if (range) ranges.push([range, "class"]);
            // }
        } else if (vl.type === LineType.PIT) {
            // {
            //     const range = vl.line.titleRange;
            //     if (range) ranges.push([range, "class"]);
            // }
            {
                const range = vl.line.controlsRange;
                if (range) ranges.push([range, "macro"]);
            }
        } else if (vl.type === VirtualOnlyLineType.CAP) {
            // {
            //     const range = vl.line.sentencesArrayRange;
            //     if (range) ranges.push([range, "class"]);
            // }
            {
                const range = vl.line.controlsRange;
                if (range) ranges.push([range, "macro"]);
            }
        } else if (vl.type === LineType.APP) {
            // {
            //     const range = vl.line.titleRange;
            //     if (range) ranges.push([range, "enumMember"]);
            // }
            {
                const range = vl.line.controlsRange;
                if (range) ranges.push([range, "macro"]);
            }
        } else if (vl.type === LineType.SPA) {
            // {
            //     const range = vl.line.titleRange;
            //     if (range) ranges.push([range, "enumMember"]);
            // }
            {
                const range = vl.line.controlsRange;
                if (range) ranges.push([range, "macro"]);
            }
        } else if (vl.type === LineType.TBL) {
            {
                const range = vl.line.attrEntriesRange;
                if (range) ranges.push([range, "macro"]);
            }
            {
                const range = vl.line.firstColumnIndicatorRange;
                if (range) ranges.push([range, "macro"]);
            }
            {
                const range = vl.line.columnIndicatorRange;
                if (range) ranges.push([range, "macro"]);
            }
            {
                const range = vl.line.multilineIndicatorRange;
                if (range) ranges.push([range, "macro"]);
            }
        } else if (vl.type === LineType.OTH) {
            {
                const range = vl.line.controlsRange;
                if (range) ranges.push([range, "macro"]);
            }
        }
        else { assertNever(vl.type); }
    }

    for (const [[start, end], type] of ranges) {
        const position = document.positionAt(start);
        yield [
            position.line,
            position.character,
            end - start,
            tokenTypes.indexOf(type),
            0,
        ] as BuilderItem;
    }
}
