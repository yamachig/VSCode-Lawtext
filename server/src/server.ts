import {
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    InitializeResult,
    _Connection,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { parse } from "lawtext/dist/src/parser/lawtext";

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

interface ExampleSettings {
    maxNumberOfProblems: number;
}

const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

export const main = (connection: _Connection) => {

    connection.onInitialize((params: InitializeParams) => {
        const capabilities = params.capabilities;

        hasConfigurationCapability = !!(
            capabilities.workspace && !!capabilities.workspace.configuration
        );
        hasWorkspaceFolderCapability = !!(
            capabilities.workspace && !!capabilities.workspace.workspaceFolders
        );

        const result: InitializeResult = {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Incremental
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

    documents.listen(connection);

    connection.listen();

};
