import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { LineType } from "lawtext/dist/src/node/cst/line";
import { VirtualOnlyLineType } from "lawtext/dist/src/parser/std/virtualLine";
import { assertNever } from "lawtext/dist/src/util";
import * as std from "lawtext/dist/src/law/std";
import { Parsed } from "./common";
import { ____Declaration } from "lawtext/dist/src/node/el/controls/declaration";
import { ____VarRef } from "lawtext/dist/src/node/el/controls/varRef";
import { __PContent, ____PF } from "lawtext/dist/src/node/el/controls";

export const tokenTypes: string[] = [];
export const tokenModifiers: string[] = [];

export type BuilderItem = [line: number, char: number, length: number, tokenType: number, tokenModifiers: number];

export function *buildSampleTokens(document: TextDocument) {
    const text = document.getText();
    const regexp = /\{(\S+?)\}/g;
    for (const m of text.matchAll(regexp)) {
        if (!m.index) continue;
        const ids = m[1].split(".");
        const position = document.positionAt(m.index);
        const tokenType = tokenTypes.findIndex(t => ids.indexOf(t) >= 0);
        const tokenModifier = ids.map(m => tokenModifiers.indexOf(m)).filter(m => m >= 0);
        yield [
            position.line,
            position.character,
            m[0].length,
            tokenType,
            (
                (tokenModifier.length >= 0)
                    ? tokenModifier.reduce((agg, m) => agg + (1 << m), 0)
                    : 0
            ),
        ] as BuilderItem;
    }
}

const boldModifier = ["defaultLibrary", "declaration", "definition"];

function *tokensOfEL(el: std.StdEL | std.__EL | string): Iterable<[[number, number], string, string[]]> {
    if (typeof el === "string") return;
    let skipChildren = false;

    if (
        (el instanceof __PContent)
            && (el.attr.type === "square")
            && !el.children.some(c => c instanceof ____Declaration)
    ) {
        if (el.range) yield [el.range, "string", []];

    } else if (el instanceof ____Declaration) {
        const nameRange = el.range;
        if (nameRange) yield [nameRange, "variable", boldModifier];

    } else if (el instanceof ____VarRef) {
        const nameRange = el.range;
        if (nameRange) yield [nameRange, "variable", []];

    } else if (el instanceof ____PF) {
        if (el.targetContainerIDs.length > 0) {
            const nameRange = el.range;
            if (nameRange) yield [nameRange, "namespace", []];
        }

    } else if (std.isQuoteStruct(el)) {
        if (el.range) yield [el.range, "regexp", []];
        skipChildren = true;

    } else if (std.isArticleGroupTitle(el) || std.isSupplProvisionLabel(el) || std.isLawTitle(el) || std.isLawNum(el)) {
        if (el.range) yield [el.range, "namespace", boldModifier];
        skipChildren = true;

    } else if (std.isTOC(el)) {
        for (const child of el.children) {
            if (child.range) {
                if (std.isTOCLabel(child)) yield [child.range, "namespace", boldModifier];
                else yield [child.range, "namespace", []];
            }
        }
        skipChildren = true;

    } else if (std.isArticleTitle(el) || std.isParagraphItemTitle(el) || std.isAppdxItemTitle(el) || std.isSupplProvisionAppdxItemTitle(el) || std.isRemarksLabel(el) || std.isNoteLikeStructTitle(el) || std.isTableStructTitle(el) || std.isFigStructTitle(el) || std.isArithFormulaNum(el)) {
        if (el.range) yield [el.range, "namespace", boldModifier];
        skipChildren = true;

    } else if (std.isRelatedArticleNum(el) || std.isArticleCaption(el) || std.isParagraphCaption(el)) {
        if (el.range) yield [el.range, "namespace", []];
        // skipChildren = true;

    } else if (std.isFig(el)) {
        if (el.range) yield [el.range, "event", []];
        skipChildren = true;
    }

    if (!skipChildren) {
        for (const child of el.children) {
            yield *tokensOfEL(child as std.StdEL | std.__EL | string);
        }
    }
}


export function *buildTokens(document: TextDocument, parsed: Parsed) {
    const { virtualLines, law } = parsed;

    const ranges: [[number, number], string, string[]][] = [];

    ranges.push(...tokensOfEL(law));

    for (const vl of virtualLines) {
        if (vl.type === LineType.BNK || vl.type === VirtualOnlyLineType.IND || vl.type === VirtualOnlyLineType.DED) {
            /**/
        } else if (vl.type === LineType.TOC) {
            // {
            //     const range = vl.line.contentRange;
            //     if (range) ranges.push([range, "typeParameter"]);
            // }
        } else if (vl.type === VirtualOnlyLineType.TAG) {
            // {
            //     const range = vl.line.contentRange;
            //     if (range) ranges.push([range, "typeParameter"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", control.control.trim().length > 1 ? [] : boldModifier]);
            }
        } else if (vl.type === VirtualOnlyLineType.TSP) {
            // {
            //     const range = vl.line.headRange;
            //     if (range) ranges.push([range, "typeParameter"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", control.control.trim().length > 1 ? [] : boldModifier]);
            }
        } else if (vl.type === LineType.ARG) {
            // {
            //     const range = vl.line.contentRange;
            //     if (range) ranges.push([range, "number"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", control.control.trim().length > 1 ? [] : boldModifier]);
            }
        } else if (vl.type === LineType.SPR) {
            // {
            //     const range = vl.line.headRange;
            //     if (range) ranges.push([range, "number"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", control.control.trim().length > 1 ? [] : boldModifier]);
            }
        } else if (vl.type === LineType.ART) {
            // {
            //     const range = vl.line.titleRange;
            //     if (range) ranges.push([range, "class"]);
            // }
        } else if (vl.type === LineType.PIT) {
            // {
            //     const range = vl.line.titleRange;
            //     if (range) ranges.push([range, "class"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", control.control.trim().length > 1 ? [] : boldModifier]);
            }
        } else if (vl.type === VirtualOnlyLineType.CAP) {
            // {
            //     const range = vl.line.sentencesArrayRange;
            //     if (range) ranges.push([range, "class"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", control.control.trim().length > 1 ? [] : boldModifier]);
            }
        } else if (vl.type === LineType.APP) {
            // {
            //     const range = vl.line.titleRange;
            //     if (range) ranges.push([range, "enumMember"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", control.control.trim().length > 1 ? [] : boldModifier]);
            }
        } else if (vl.type === LineType.SPA) {
            // {
            //     const range = vl.line.titleRange;
            //     if (range) ranges.push([range, "enumMember"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", control.control.trim().length > 1 ? [] : boldModifier]);
            }
        } else if (vl.type === LineType.TBL) {
            for (const attrEntry of vl.line.attrEntries) {
                const range = attrEntry.entryRange;
                if (range) ranges.push([range, "keyword", []]);
            }
            {
                const range = vl.line.firstColumnIndicatorRange;
                if (range) ranges.push([range, "keyword", boldModifier]);
            }
            {
                const range = vl.line.columnIndicatorRange;
                if (range) ranges.push([range, "keyword", boldModifier]);
            }
            {
                const range = vl.line.multilineIndicatorRange;
                if (range) ranges.push([range, "keyword", boldModifier]);
            }
        } else if (vl.type === LineType.OTH) {
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", control.control.trim().length > 1 ? [] : boldModifier]);
            }
        }
        else { assertNever(vl.type); }
    }

    ranges.sort(([r1], [r2]) => (r1[0] - r2[0]) || (r1[1] - r2[1]));

    for (let i = 0; i < ranges.length; i++) {
        const [currentRange, ...currentRest] = ranges[i];
        for (let j = i + 1; j < ranges.length; j++) {
            const [nextRange] = ranges[j];
            if (currentRange[1] <= nextRange[0]) break;
            if (nextRange[1] < currentRange[1]) {
                ranges.splice(j + 1, 0, [[nextRange[1], currentRange[1]], ...currentRest]);
            }
            currentRange[1] = nextRange[0];
        }
    }

    for (const [[start, end], type, modifiers] of ranges) {
        const tokenModifier = modifiers.map(m => tokenModifiers.indexOf(m)).filter(m => m >= 0);
        const startPosition = document.positionAt(start);
        const endPosition = document.positionAt(end);
        for (let line = startPosition.line; line <= endPosition.line; line++) {
            const length = (
                line === endPosition.line
                    ? (
                        endPosition.character - (
                            line === startPosition.line
                                ? startPosition.character
                                : 0
                        )
                    )
                    : document.offsetAt({ line: line + 1, character: 0 }) - document.offsetAt({ line: line, character: 0 })
            );
            if (length === 0) continue;
            yield [
                line,
                (
                    line === startPosition.line
                        ? startPosition.character
                        : 0
                ),
                length,
                tokenTypes.indexOf(type),
                (
                    (tokenModifier.length >= 0)
                        ? tokenModifier.reduce((agg, m) => agg + (1 << m), 0)
                        : 0
                ),
            ] as BuilderItem;
        }
    }
}
