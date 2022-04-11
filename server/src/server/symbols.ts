import {
    DocumentSymbol,
    Range,
    SymbolKind,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { EL } from "lawtext/dist/src/node/el";
import { AppdxItemTitle, isAppdxItem, isAppdxItemTitle, isArticle, isArticleCaption, isArticleGroup, isArticleGroupTitle, isArticleTitle, isEnactStatement, isLaw, isLawBody, isLawNum, isLawTitle, isMainProvision, isParagraphCaption, isParagraphItem, isParagraphItemTitle, isPreamble, isSupplProvision, isSupplProvisionAppdxItem, isSupplProvisionAppdxItemTitle, isSupplProvisionLabel, isTOC, isTOCLabel, SupplProvisionAppdxItemTitle } from "lawtext/dist/src/law/std";
import { Parsed } from "./common";

export const getSymbols = (document: TextDocument, parsed: Parsed): DocumentSymbol[] => {
    return [...symbolsOfEL(document, parsed.law)];
};

const toRange = <TRange extends [number, number] | null | undefined>(document: TextDocument, range: TRange): TRange extends (null | undefined) ? null : Range => (
    (range && {
        start: document.positionAt(range[0]),
        end: document.positionAt(range[1]),
    }) ?? null
) as TRange extends (null | undefined) ? null : Range;

function *symbolsOfEL(document: TextDocument, el: EL | string | null | undefined): Iterable<DocumentSymbol> {
    if (typeof el === "string" || !el) return;
    if (isLaw(el)) {
        const lawNum = el.children.find(isLawNum);
        const lawBody = el.children.find(isLawBody);
        const lawTitle = lawBody?.children.find(isLawTitle);
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, lawTitle?.range ?? lawNum?.range ?? (el.range && [el.range[0], el.range[0]]));
        const lawNumInParentheses = (
            lawNum?.text
                ? (
                    /^[(（]/.exec(lawNum.text)
                        ? lawNum.text
                        : `（${lawNum.text}）`
                )
                : ""
        );
        const displayName = (lawTitle || lawNum) ? `${lawTitle?.text ?? ""}${lawNumInParentheses}` : "";
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.File,
            range,
            selectionRange,
            children: [...symbolsOfEL(document, lawBody)]
        };
    } else if (isLawBody(el)) {
        for (const child of el.children) {
            if (isLawTitle(child)) continue;
            yield *symbolsOfEL(document, child);
        }
    } else if (isEnactStatement(el)) {
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, (el.range && [el.range[0], el.range[0]]));
        const displayName = `制定文「${el.text.slice(0, 10)}${el.text.length > 10 ? "…" : ""}」`;
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.EnumMember,
            range,
            selectionRange,
        };
    } else if (isTOC(el)) {
        const title = el.children.find(isTOCLabel);
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, title?.range ?? (el.range && [el.range[0], el.range[0]]));
        const displayName = title?.text ?? "目次";
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.EnumMember,
            range,
            selectionRange,
        };
    } else if (isPreamble(el)) {
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, (el.range && [el.range[0], el.range[0]]));
        const displayName = "前文";
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.EnumMember,
            range,
            selectionRange,
        };
    } else if (isMainProvision(el)) {
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, (el.range && [el.range[0], el.range[0]]));
        const displayName = "本則";
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.Namespace,
            range,
            selectionRange,
            children: el.children.map(c => [...symbolsOfEL(document, c)]).flat(),
        };
    } else if (isArticleGroup(el)) {
        const title = (el.children as (typeof el.children)[number][]).find(isArticleGroupTitle);
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, title?.range ?? (el.range && [el.range[0], el.range[0]]));
        const displayName = title?.text ?? "";
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.Namespace,
            range,
            selectionRange,
            children: (
                (el.children as (typeof el.children)[number][])
                    .filter(c => !isArticleGroupTitle(c))
                    .map(c => [...symbolsOfEL(document, c)])
                    .flat()
            ),
        };
    } else if (isSupplProvision(el)) {
        const title = el.children.find(isSupplProvisionLabel);
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, title?.range ?? (el.range && [el.range[0], el.range[0]]));
        const amendLawNumInParentheses = (
            el.attr.AmendLawNum
                ? "　" + (
                    /^[(（]/.exec(el.attr.AmendLawNum)
                        ? el.attr.AmendLawNum
                        : `（${el.attr.AmendLawNum}）`
                )
                : ""
        );
        const displayName = `${title?.text ?? "附則"}${amendLawNumInParentheses}${el.attr.Extract ? "　抄" : ""}`;
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.Namespace,
            range,
            selectionRange,
            children: (
                el.children
                    .filter(c => !isSupplProvisionLabel(c))
                    .map(c => [...symbolsOfEL(document, c)])
                    .flat()
            ),
        };
    } else if (isArticle(el)) {
        const title = (el.children as (typeof el.children)[number][]).find(isArticleTitle);
        const caption = (el.children as (typeof el.children)[number][]).find(isArticleCaption);
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, title?.range ?? (el.range && [el.range[0], el.range[0]]));
        const displayName = `${title?.text ?? ""}${caption?.text ?? ""}`;
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.EnumMember,
            range,
            selectionRange,
            // children: (
            //     (el.children as (typeof el.children)[number][])
            //         .filter(c => !isArticleTitle(c) && !isArticleCaption(c))
            //         .map(c => [...symbolsOfEL(document, c)])
            //         .flat()
            // ),
        };
    } else if (isParagraphItem(el)) {
        const title = (el.children as (typeof el.children)[number][]).find(isParagraphItemTitle);
        const caption = (el.children as (typeof el.children)[number][]).find(isParagraphCaption);
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, title?.range ?? (el.range && [el.range[0], el.range[0]]));
        const displayName = `${title?.text ?? ""}${caption?.text ?? ""}`;
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.EnumMember,
            range,
            selectionRange,
            // children: (
            //     (el.children as (typeof el.children)[number][])
            //         .filter(c => !isParagraphItemTitle(c) && !isParagraphCaption(c) && !isParagraphItemSentence(c))
            //         .map(c => [...symbolsOfEL(document, c)])
            //         .flat()
            // ),
        };
    } else if (isAppdxItem(el) || isSupplProvisionAppdxItem(el)) {
        const title = (el.children as (typeof el.children)[number][]).find(c => isAppdxItemTitle(c) || isSupplProvisionAppdxItemTitle(c)) as AppdxItemTitle | SupplProvisionAppdxItemTitle | undefined;
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, title?.range ?? (el.range && [el.range[0], el.range[0]]));
        const displayName = `${title?.text ?? ""}`;
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.EnumMember,
            range,
            selectionRange,
        };
    } else {
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, el.range && [el.range[0], el.range[0]]);
        if (range && selectionRange) yield {
            name: `<${el.tag}>`,
            kind: SymbolKind.EnumMember,
            range,
            selectionRange,
        };
    }
}

