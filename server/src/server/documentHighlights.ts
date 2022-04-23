import { ____VarRef } from "lawtext/dist/src/node/el/controls/varRef";
import {
    DocumentHighlight,
    Position,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { Parsed } from "./common";

export const getDocumentHighlights = (document: TextDocument, parsed: Parsed, position: Position): DocumentHighlight[] => {
    const offset = document.offsetAt(position);
    const { variableReferences, declarations } = parsed;
    const highlights: DocumentHighlight[] = [];

    const varRefs: ____VarRef[] = [];

    for (const varRef of variableReferences) {
        if (varRef.range && varRef.range[0] <= offset && offset < varRef.range[1]) {
            const nameRange = declarations.get(varRef.attr.declarationID).nameRange;
            if (nameRange) {
                highlights.push({
                    range: {
                        start: document.positionAt(nameRange[0]),
                        end: document.positionAt(nameRange[1]),
                    },
                });
            }
            varRefs.push(...variableReferences.filter(r => r.attr.declarationID === varRef.attr.declarationID));
            break;
        }
    }

    for (const decl of declarations.db.values()) {
        if (decl.nameRange && decl.nameRange[0] <= offset && offset < decl.nameRange[1]) {
            if (decl.nameRange) {
                highlights.push({
                    range: {
                        start: document.positionAt(decl.nameRange[0]),
                        end: document.positionAt(decl.nameRange[1]),
                    },
                });
            }
            varRefs.push(...variableReferences.filter(r => r.attr.declarationID === decl.attr.declarationID));
            break;
        }
    }

    for (const varRef of varRefs) {
        if (varRef.range) {
            highlights.push({
                range: {
                    start: document.positionAt(varRef.range[0]),
                    end: document.positionAt(varRef.range[1]),
                },
            });
        }
    }

    return highlights;
};
