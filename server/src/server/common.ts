import type { Analysis } from "lawtext/dist/src/analyzer";
import type { Law } from "lawtext/dist/src/law/std";
import type { ErrorMessage } from "lawtext/dist/src/parser/cst/error";
import type { VirtualLine } from "lawtext/dist/src/parser/std/virtualLine";
import type { Range } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";

export interface Parsed extends Analysis {
    law: Law,
    parseErrors: ErrorMessage[],
    virtualLines: VirtualLine[],
}

export const toRange = <TRange extends [number, number] | null | undefined>(document: TextDocument, range: TRange): TRange extends (null | undefined) ? null : Range => (
    (range && {
        start: document.positionAt(range[0]),
        end: document.positionAt(range[1]),
    }) ?? null
) as TRange extends (null | undefined) ? null : Range;
