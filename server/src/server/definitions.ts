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
    const { variableReferences, pointerRangesList, containers } = parsed;
    const links: LocationLink[] = [];

    for (const varRef of variableReferences) {
        const declaration = parsed.declarations.get(varRef.attr.declarationID);
        if (varRef.range && declaration.range && declaration.range && varRef.range[0] <= offset && offset < varRef.range[1]) {
            links.push({
                targetUri: document.uri,
                targetRange: {
                    start: document.positionAt(declaration.range[0]),
                    end: document.positionAt(declaration.range[1]),
                },
                originSelectionRange: {
                    start: document.positionAt(varRef.range[0]),
                    end: document.positionAt(varRef.range[1]),
                },
                targetSelectionRange: {
                    start: document.positionAt(declaration.range[0]),
                    end: document.positionAt(declaration.range[1]),
                },
            });
        }
    }

    for (const fragment of pointerRangesList.map(l => l.ranges()).flat().map(r => r.pointers()).flat().map(p => p.fragments()).flat()) {
        if (!fragment.range) continue;
        for (const containerID of fragment.targetContainerIDs.slice(-1)) {
            const container = containers.get(containerID);
            if (!container || !container.el.range) continue;
            if (!(fragment.range[0] <= offset && offset < fragment.range[1])) continue;
            links.push({
                targetUri: document.uri,
                targetRange: {
                    start: document.positionAt(container.el.range[0]),
                    end: document.positionAt(container.el.range[1]),
                },
                originSelectionRange: {
                    start: document.positionAt(fragment.range[0]),
                    end: document.positionAt(fragment.range[1]),
                },
                targetSelectionRange: {
                    start: document.positionAt(container.el.range[0]),
                    end: document.positionAt(container.el.range[1]),
                },
            });
        }
    }

    return links;
};
