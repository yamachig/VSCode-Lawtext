import { Declarations, ____VarRef } from "lawtext/dist/src/analyzer";
import { Law } from "lawtext/dist/src/law/std";
import { ErrorMessage } from "lawtext/dist/src/parser/cst/error";
import { VirtualLine } from "lawtext/dist/src/parser/std/virtualLine";

export interface Parsed {
    law: Law,
    parseErrors: ErrorMessage[],
    virtualLines: VirtualLine[],
    declarations: Declarations,
    variableReferences: ____VarRef[],
}
