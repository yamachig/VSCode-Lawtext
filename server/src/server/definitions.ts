import {
    LocationLink,
    Position,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { Parsed } from "./common";

export const getDefinitions = (document: TextDocument, parsed: Parsed, position: Position): LocationLink[] => {
    const offset = document.offsetAt(position);
    const { variableReferences } = parsed;
    const links: LocationLink[] = [];

    for (const varRef of variableReferences) {
        if (varRef.range && varRef.declaration.range && varRef.declaration.nameRange && varRef.range[0] <= offset && offset < varRef.range[1]) {
            links.push({
                targetUri: document.uri,
                targetRange: {
                    start: document.positionAt(varRef.declaration.range[0]),
                    end: document.positionAt(varRef.declaration.range[1]),
                },
                originSelectionRange: {
                    start: document.positionAt(varRef.range[0]),
                    end: document.positionAt(varRef.range[1]),
                },
                targetSelectionRange: {
                    start: document.positionAt(varRef.declaration.nameRange[0]),
                    end: document.positionAt(varRef.declaration.nameRange[1]),
                },
            });
        }
    }

    return links;
};
