import { Declarations, ____VarRef } from "lawtext/dist/src/analyzer";
import { Law } from "lawtext/dist/src/law/std";
import { ErrorMessage } from "lawtext/dist/src/parser/cst/error";
import { VirtualLine } from "lawtext/dist/src/parser/std/virtualLine";
import { Range } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

export interface Parsed {
    law: Law,
    parseErrors: ErrorMessage[],
    virtualLines: VirtualLine[],
    declarations: Declarations,
    variableReferences: ____VarRef[],
}

export const toRange = <TRange extends [number, number] | null | undefined>(document: TextDocument, range: TRange): TRange extends (null | undefined) ? null : Range => (
    (range && {
        start: document.positionAt(range[0]),
        end: document.positionAt(range[1]),
    }) ?? null
) as TRange extends (null | undefined) ? null : Range;
