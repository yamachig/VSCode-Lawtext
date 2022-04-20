import {
    CodeLens,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { EL, JsonEL } from "lawtext/dist/src/node/el";
import * as std from "lawtext/dist/src/law/std";
import { Parsed, toRange } from "./common";

export type PreviewJsonELCodeLens = Omit<CodeLens, "data"> & {
    data: {
        command: "extension.previewEL",
        title: string,
        jsonEL: JsonEL,
        documentURI: string,
    }
};
export const isPreviewJsonELCodeLens = (codeLens: CodeLens): codeLens is PreviewJsonELCodeLens => {
    return codeLens.data?.command === "extension.previewEL";
};

export const getCodeLenses = (document: TextDocument, parsed: Parsed): PreviewJsonELCodeLens[] => {
    return [...codeLensesOfEL(document, parsed.law)];
};

function *codeLensesOfEL(document: TextDocument, el: EL | string | null | undefined): Iterable<PreviewJsonELCodeLens> {
    if (typeof el === "string" || !el) return;
    if (std.isTable(el) && el.range) {
        yield {
            range: toRange(document, el.range),
            data: {
                command: "extension.previewEL" as const,
                title: "📃表をプレビュー",
                jsonEL: el.json(true),
                documentURI: document.uri,
            }
        };
    }
    for (const child of el.children) {
        yield* codeLensesOfEL(document, child);
    }
}
export const getCodeLensResolve = (codeLens: CodeLens): CodeLens => {
    if (isPreviewJsonELCodeLens(codeLens)) {
        return {
            range: codeLens.range,
            command: {
                title: codeLens.data.title,
                command: codeLens.data.command,
                arguments: [codeLens.data.jsonEL, codeLens.data.documentURI],
            }
        };

    } else {
        return codeLens;
    }
};

