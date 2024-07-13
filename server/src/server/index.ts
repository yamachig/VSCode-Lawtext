import type {
    InitializeParams,
    InitializeResult,
    _Connection,
    ServerCapabilities } from "vscode-languageserver";
import {
    TextDocuments,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    SemanticTokensBuilder
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import type { BuilderItem } from "./semanticTokens";
import { buildSampleTokens, buildTokens, tokenModifiers, tokenTypes } from "./semanticTokens";
import { getDiagnostics } from "./diagnostics";

import { parse } from "lawtext/dist/src/parser/lawtext";
import { analyze } from "lawtext/dist/src/analyzer";
import { getHover } from "./hover";
import { getSymbols } from "./symbols";
import type { Parsed } from "./common";
import { getDefinitions } from "./definitions";
import { getReferences } from "./references";
import { getDocumentHighlights } from "./documentHighlights";
import { getCodeLenses, getCodeLensResolve } from "./codeLenses";
import { getDocumentLinks } from "./documentLinks";

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const parsedCache: Map<string, Parsed> = new Map();
const getParsed = (textDocument: TextDocument): Parsed => {
    const cached = parsedCache.get(textDocument.uri);
    if (cached) return cached;

    const { value: law, errors: parseErrors, virtualLines } = parse(textDocument.getText());
    const analysis = analyze(law);

    const parsed: Parsed = {
        law,
        parseErrors,
        virtualLines,
        ...analysis,
    };
    parsedCache.set(textDocument.uri, parsed);
    return parsed;

};
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasSemanticTokensCapability = false;
let hasHoverCapability = false;
let hasDocumentSymbolCapability = false;
let hasDefinitionCapability = false;
let hasReferencesCapability = false;
let hasDocumentHighlightCapability = false;
let hasCodeLensCapability = false;
let hasDocumentLinkCapability = false;

interface ExampleSettings {
    maxNumberOfProblems: number;
}

const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();
const tokenBuilders: Map<string, SemanticTokensBuilder> = new Map();
const getTokenBuilder = (textDocument: TextDocument): SemanticTokensBuilder => {
    const builder = tokenBuilders.get(textDocument.uri) ?? new SemanticTokensBuilder();
    if (!tokenBuilders.has(textDocument.uri)) tokenBuilders.set(textDocument.uri, builder);
    return builder;
};

export const main = (connection: _Connection) => {

    const onInitializedHandlers: (() => void)[] = [];

    connection.onInitialize((params: InitializeParams): InitializeResult => {
        const clientCapabilities = params.capabilities;
        // console.log(`Client capabilities: ${JSON.stringify(capabilities, null, 2)}`);

        const serverCapabilities: ServerCapabilities = {
            textDocumentSync: {
                openClose: true,
                change: TextDocumentSyncKind.Incremental,
            },
        };

        hasConfigurationCapability = Boolean(
            clientCapabilities.workspace && Boolean(clientCapabilities.workspace.configuration)
        );
        if (hasConfigurationCapability) {
            onInitializedHandlers.push(() => {
                connection.client.register(DidChangeConfigurationNotification.type, undefined);
            });
        }

        hasWorkspaceFolderCapability = Boolean(
            clientCapabilities.workspace && Boolean(clientCapabilities.workspace.workspaceFolders)
        );
        if (hasWorkspaceFolderCapability) {
            serverCapabilities.workspace = {
                workspaceFolders: {
                    supported: true
                }
            };
            onInitializedHandlers.push(() => {
                connection.workspace.onDidChangeWorkspaceFolders(() => {
                    connection.console.log("Workspace folder change event received.");
                });
            });
        }

        const semanticTokensClientCapability = clientCapabilities.textDocument?.semanticTokens;
        if (semanticTokensClientCapability) {
            tokenTypes.push(...semanticTokensClientCapability.tokenTypes);
            tokenModifiers.push(...semanticTokensClientCapability.tokenModifiers);
        }
        hasSemanticTokensCapability = Boolean(semanticTokensClientCapability);
        if (hasSemanticTokensCapability) {
            serverCapabilities.semanticTokensProvider = {
                documentSelector: [{ language: "lawtext" }],
                legend: { tokenTypes, tokenModifiers },
                range: false,
                full: {
                    delta: true
                },
            };
        }

        hasHoverCapability = Boolean(clientCapabilities.textDocument?.hover);
        serverCapabilities.hoverProvider = hasHoverCapability;

        hasDocumentSymbolCapability = Boolean(clientCapabilities.textDocument?.documentSymbol);
        serverCapabilities.documentSymbolProvider = hasDocumentSymbolCapability;

        hasDefinitionCapability = Boolean(clientCapabilities.textDocument?.definition);
        serverCapabilities.definitionProvider = hasDefinitionCapability;

        hasReferencesCapability = Boolean(clientCapabilities.textDocument?.references);
        serverCapabilities.referencesProvider = hasReferencesCapability;

        hasDocumentHighlightCapability = Boolean(clientCapabilities.textDocument?.documentHighlight);
        serverCapabilities.documentHighlightProvider = hasDocumentHighlightCapability;

        hasCodeLensCapability = Boolean(clientCapabilities.textDocument?.codeLens);
        if (hasCodeLensCapability) {
            serverCapabilities.codeLensProvider = {
                resolveProvider: true,
            };
        }

        hasDocumentLinkCapability = Boolean(clientCapabilities.textDocument?.documentLink);
        if (hasDocumentLinkCapability) {
            serverCapabilities.documentLinkProvider = {
                resolveProvider: false,
            };
        }

        return {
            capabilities: serverCapabilities,
        };
    });

    connection.onInitialized(() => {
        for (const handler of onInitializedHandlers) {
            handler();
        }
        onInitializedHandlers.splice(0, onInitializedHandlers.length);
    });

    connection.onDidChangeConfiguration(() => {
        if (hasConfigurationCapability) {
            documentSettings.clear();
        }

        documents.all().forEach(document => {
            const parsed = getParsed(document);
            const diagnostics = getDiagnostics(document, parsed);
            connection.sendDiagnostics({ uri: document.uri, diagnostics });
        });
    });

    documents.onDidClose(e => {
        console.dir({ method: "documents.onDidClose", e });
        const document = e.document;
        connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
        documentSettings.delete(document.uri);
        tokenBuilders.delete(document.uri);
        parsedCache.delete(document.uri);
    });

    documents.onDidChangeContent(change => {
        console.dir({ method: "documents.onDidChangeContent", change });
        const document = change.document;
        parsedCache.delete(document.uri);
        const parsed = getParsed(document);
        const diagnostics = getDiagnostics(document, parsed);
        connection.sendDiagnostics({ uri: document.uri, diagnostics });
    });

    connection.onDidChangeWatchedFiles(() => {
        connection.console.log("We received an file change event");
    });

    connection.onHover(e => {
        const document = documents.get(e.textDocument.uri);
        if (document === undefined) {
            return null;
        }
        const parsed = getParsed(document);
        const hover = getHover(document, parsed, e.position);
        return hover;
    });

    connection.onDocumentSymbol(e => {
        const document = documents.get(e.textDocument.uri);
        if (document === undefined) {
            return null;
        }
        const parsed = getParsed(document);
        const symbols = getSymbols(document, parsed);
        return symbols;
    });

    connection.onDefinition(e => {
        const document = documents.get(e.textDocument.uri);
        if (document === undefined) {
            return null;
        }
        const parsed = getParsed(document);
        const definition = getDefinitions(document, parsed, e.position);
        return definition;
    });

    connection.onReferences(e => {
        const document = documents.get(e.textDocument.uri);
        if (document === undefined) {
            return null;
        }
        const parsed = getParsed(document);
        const definition = getReferences(document, parsed, e.position);
        return definition;
    });

    connection.onDocumentHighlight(e => {
        const document = documents.get(e.textDocument.uri);
        if (document === undefined) {
            return null;
        }
        const parsed = getParsed(document);
        const definition = getDocumentHighlights(document, parsed, e.position);
        return definition;
    });

    connection.onCodeLens(e => {
        const document = documents.get(e.textDocument.uri);
        if (document === undefined) {
            return null;
        }
        const parsed = getParsed(document);
        const codeLenses = getCodeLenses(document, parsed);
        return codeLenses;
    });

    connection.onCodeLensResolve(codeLens => {
        const retCodeLens = getCodeLensResolve(codeLens);
        return retCodeLens;
    });

    connection.onDocumentLinks(e => {
        const document = documents.get(e.textDocument.uri);
        if (document === undefined) {
            return null;
        }
        const parsed = getParsed(document);
        const documentLinks = getDocumentLinks(document, parsed);
        return documentLinks;
    });

    connection.languages.semanticTokens.on((params) => {
        console.dir({ method: "connection.languages.semanticTokens.on", params });
        const document = documents.get(params.textDocument.uri);
        if (document === undefined) {
            return { data: [] };
        }
        const builder = getTokenBuilder(document);

        const parsed = getParsed(document);

        const builderItems: BuilderItem[] = [
            ...buildSampleTokens(document),
            ...buildTokens(document, parsed),
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
        const builder = getTokenBuilder(document);

        const parsed = getParsed(document);

        const builderItems: BuilderItem[] = [
            ...buildSampleTokens(document),
            ...buildTokens(document, parsed),
        ];
        builderItems.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
        builder.previousResult(params.previousResultId);
        for (const item of builderItems) {
            builder.push(...item);
        }
        return builder.build();
    });

    connection.languages.semanticTokens.onRange((params) => {
        console.dir({ method: "connection.languages.semanticTokens.onRange", params });
        return { data: [] };
    });

    documents.listen(connection);

    connection.listen();

};
