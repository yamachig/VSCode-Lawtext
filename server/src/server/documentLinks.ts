import { EL } from "lawtext/dist/src/node/el";
import { lawNumLikeToLawNum } from "lawtext/dist/src/law/lawNum";

import {
    DocumentLink,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { Parsed } from "./common";

function *getDocumentLinksOfEL(document: TextDocument, el: EL | string): Iterable<DocumentLink> {
    if (typeof el === "string") return;
    if (el.tag === "____LawNum" && el.range) {
        yield {
            range: {
                start: document.positionAt(el.range[0]),
                end: document.positionAt(el.range[1]),
            },
            target: `lawtext:/elaws/lawnum/${lawNumLikeToLawNum(el.text())}.law.txt`,
        };
    }
    for (const child of el.children) {
        yield *getDocumentLinksOfEL(document, child);
    }
}

export const getDocumentLinks = (document: TextDocument, parsed: Parsed): DocumentLink[] => {
    const { law } = parsed;

    const links = [...getDocumentLinksOfEL(document, law)];

    return links;
};
