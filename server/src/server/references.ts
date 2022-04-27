import { ____VarRef } from "lawtext/dist/src/node/el/controls/varRef";
import {
    Location,
    Position,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { Parsed } from "./common";

export const getReferences = (document: TextDocument, parsed: Parsed, position: Position): Location[] => {
    const offset = document.offsetAt(position);
    const { variableReferences, declarations } = parsed;
    const locations: Location[] = [];

    const varRefs: ____VarRef[] = [];

    for (const varRef of variableReferences) {
        if (varRef.range && varRef.range[0] <= offset && offset < varRef.range[1]) {
            const nameRange = declarations.get(varRef.attr.declarationID).range;
            if (nameRange) {
                locations.push({
                    uri: document.uri,
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
        if (decl.range && decl.range[0] <= offset && offset < decl.range[1]) {
            if (decl.range) {
                locations.push({
                    uri: document.uri,
                    range: {
                        start: document.positionAt(decl.range[0]),
                        end: document.positionAt(decl.range[1]),
                    },
                });
            }
            varRefs.push(...variableReferences.filter(r => r.attr.declarationID === decl.attr.declarationID));
            break;
        }
    }

    for (const varRef of varRefs) {
        if (varRef.range) {
            locations.push({
                uri: document.uri,
                range: {
                    start: document.positionAt(varRef.range[0]),
                    end: document.positionAt(varRef.range[1]),
                },
            });
        }
    }

    return locations;
};
