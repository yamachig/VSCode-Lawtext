import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { parse } from "lawtext/dist/src/parser/lawtext";
import { LineType } from "lawtext/dist/src/node/cst/line";
import { VirtualOnlyLineType } from "lawtext/dist/src/parser/std/virtualLine";
import { assertNever } from "lawtext/dist/src/util";
import { isAppdxItemTitle, isArithFormulaNum, isArticleCaption, isArticleGroupTitle, isArticleTitle, isControl, isFig, isLawNum, isLawTitle, isNoteLikeStructTitle, isParagraphCaption, isParagraphItemTitle, isRelatedArticleNum, isRemarksLabel, isSupplProvisionAppdxItemTitle, isSupplProvisionLabel, isTableStructTitle, isTOC, isTOCLabel, StdEL, __EL } from "lawtext/dist/src/law/std";

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

function *rangesOfEL(el: StdEL | __EL | string): Iterable<[[number, number], string, string[]]> {
    if (typeof el === "string") return;
    let skipChildren = false;
    if (isControl(el)) {
        if (el.tag === "__PContent") {
            if (el.attr.type === "square") {
                if (el.range) yield [el.range, "string", []];
            }
        }
    } else if (isArticleGroupTitle(el) || isSupplProvisionLabel(el) || isLawTitle(el) || isLawNum(el)) {
        if (el.range) yield [el.range, "namespace", boldModifier];
        skipChildren = true;
    } else if (isTOC(el)) {
        for (const child of el.children) {
            if (child.range) {
                if (isTOCLabel(child)) yield [child.range, "namespace", boldModifier];
                else yield [child.range, "namespace", []];
            }
        }
        skipChildren = true;
    } else if (isArticleTitle(el) || isArticleCaption(el) || isParagraphItemTitle(el) || isParagraphCaption(el) || isAppdxItemTitle(el) || isSupplProvisionAppdxItemTitle(el) || isRemarksLabel(el) || isNoteLikeStructTitle(el) || isTableStructTitle(el) || isArithFormulaNum(el)) {
        if (el.range) yield [el.range, "enumMember", boldModifier];
        skipChildren = true;
    } else if (isRelatedArticleNum(el)) {
        if (el.range) yield [el.range, "enumMember", []];
        skipChildren = true;
    } else if (isFig(el)) {
        if (el.range) yield [el.range, "event", []];
        skipChildren = true;
    }
    if (!skipChildren) {
        for (const child of el.children) {
            yield *rangesOfEL(child as StdEL | __EL | string);
        }
    }
}


export function *buildTokens(document: TextDocument, parsed: ReturnType<typeof parse>) {
    const { virtualLines, value: law } = parsed;

    const ranges: [[number, number], string, string[]][] = [];

    ranges.push(...rangesOfEL(law));

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
                if (range) ranges.push([range, "keyword", []]);
            }
        } else if (vl.type === VirtualOnlyLineType.TSP) {
            // {
            //     const range = vl.line.headRange;
            //     if (range) ranges.push([range, "typeParameter"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", []]);
            }
        } else if (vl.type === LineType.ARG) {
            // {
            //     const range = vl.line.contentRange;
            //     if (range) ranges.push([range, "number"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", []]);
            }
        } else if (vl.type === LineType.SPR) {
            // {
            //     const range = vl.line.headRange;
            //     if (range) ranges.push([range, "number"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", []]);
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
                if (range) ranges.push([range, "keyword", []]);
            }
        } else if (vl.type === VirtualOnlyLineType.CAP) {
            // {
            //     const range = vl.line.sentencesArrayRange;
            //     if (range) ranges.push([range, "class"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", []]);
            }
        } else if (vl.type === LineType.APP) {
            // {
            //     const range = vl.line.titleRange;
            //     if (range) ranges.push([range, "enumMember"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", []]);
            }
        } else if (vl.type === LineType.SPA) {
            // {
            //     const range = vl.line.titleRange;
            //     if (range) ranges.push([range, "enumMember"]);
            // }
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", []]);
            }
        } else if (vl.type === LineType.TBL) {
            for (const attrEntry of vl.line.attrEntries) {
                const range = attrEntry.entryRange;
                if (range) ranges.push([range, "keyword", []]);
            }
            {
                const range = vl.line.firstColumnIndicatorRange;
                if (range) ranges.push([range, "keyword", []]);
            }
            {
                const range = vl.line.columnIndicatorRange;
                if (range) ranges.push([range, "keyword", []]);
            }
            {
                const range = vl.line.multilineIndicatorRange;
                if (range) ranges.push([range, "keyword", []]);
            }
        } else if (vl.type === LineType.OTH) {
            for (const control of vl.line.controls) {
                const range = control.controlRange;
                if (range) ranges.push([range, "keyword", []]);
            }
        }
        else { assertNever(vl.type); }
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
