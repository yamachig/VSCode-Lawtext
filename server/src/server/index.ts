import {
    TextDocuments,
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

import { BuilderItem, buildSampleTokens, buildTokens, tokenModifiers, tokenTypes } from "./semanticTokens";
import { getDiagnostics } from "./diagnostics";

import { parse } from "lawtext/dist/src/parser/lawtext";
import { analyze } from "lawtext/dist/src/analyzer";
import { getHover } from "./hover";
import { getSymbols } from "./symbols";
import { Parsed } from "./common";
import { getDefinitions } from "./definitions";
import { getReferences } from "./references";
import { getDocumentHighlights } from "./documentHighlights";

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const parsedCache: Map<string, Parsed> = new Map();
const getParsed = (textDocument: TextDocument): Parsed => {
    const cached = parsedCache.get(textDocument.uri);
    if (cached) return cached;

    const { value: law, errors: parseErrors, virtualLines } = parse(textDocument.getText());
    const { declarations, variableReferences } = analyze(law);

    const parsed: Parsed = {
        law,
        parseErrors,
        virtualLines,
        declarations,
        variableReferences,
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

    connection.onInitialize((params: InitializeParams) => {
        const capabilities = params.capabilities;
        // console.log(`Client capabilities: ${JSON.stringify(capabilities, null, 2)}`);

        hasConfigurationCapability = !!(
            capabilities.workspace && !!capabilities.workspace.configuration
        );
        hasWorkspaceFolderCapability = !!(
            capabilities.workspace && !!capabilities.workspace.workspaceFolders
        );
        const semanticTokensClientCapability = capabilities.textDocument?.semanticTokens;
        hasSemanticTokensCapability = !!semanticTokensClientCapability;

        hasHoverCapability = !!(capabilities.textDocument?.hover);

        hasDocumentSymbolCapability = !!(capabilities.textDocument?.documentSymbol);

        hasDefinitionCapability = !!(capabilities.textDocument?.definition);

        hasReferencesCapability = !!(capabilities.textDocument?.references);

        hasDocumentHighlightCapability = !!(capabilities.textDocument?.documentHighlight);

        if (semanticTokensClientCapability) {
            tokenTypes.push(...semanticTokensClientCapability.tokenTypes);
            tokenModifiers.push(...semanticTokensClientCapability.tokenModifiers);
        }

        const result: InitializeResult = {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Incremental,
                hoverProvider: hasHoverCapability,
                documentSymbolProvider: hasDocumentSymbolCapability,
                definitionProvider: hasDefinitionCapability,
                referencesProvider: hasReferencesCapability,
                documentHighlightProvider: hasDocumentHighlightCapability,
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

        documents.all().forEach(document => {
            const parsed = getParsed(document);
            const diagnostics = getDiagnostics(document, parsed);
            connection.sendDiagnostics({ uri: document.uri, diagnostics });
        });
    });

    documents.onDidClose(e => {
        const document = e.document;
        documentSettings.delete(document.uri);
        tokenBuilders.delete(document.uri);
        parsedCache.delete(document.uri);
    });

    documents.onDidChangeContent(change => {
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
