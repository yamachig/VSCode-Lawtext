import {
    Diagnostic,
    DiagnosticSeverity,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { Parsed } from "./common";

const showAnalyzeErrors = false;
export const getDiagnostics = (textDocument: TextDocument, parsed: Parsed) => {
    const { parseErrors, errors: analyzeErrors } = parsed;

    const diagnostics: Diagnostic[] = [];
    for (const error of [...parseErrors, ...(showAnalyzeErrors ? analyzeErrors : [])]) {
        const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: {
                start: textDocument.positionAt(error.range[0]),
                end: textDocument.positionAt(error.range[1]),
            },
            message: error.message,
            source: "Lawtext"
        };
        diagnostics.push(diagnostic);
    }

    return diagnostics;
};
