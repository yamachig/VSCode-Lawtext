import {
    Diagnostic,
    DiagnosticSeverity,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { Parsed } from "./common";


export const getDiagnostics = (textDocument: TextDocument, parsed: Parsed) => {
    const { parseErrors: errors } = parsed;

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

    return diagnostics;
};
