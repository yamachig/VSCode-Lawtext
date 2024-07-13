import type {
    DocumentSymbol } from "vscode-languageserver";
import {
    SymbolKind,
} from "vscode-languageserver";

import type {
    TextDocument
} from "vscode-languageserver-textdocument";

import type { EL } from "lawtext/dist/src/node/el";
import * as std from "lawtext/dist/src/law/std";
import type { Parsed } from "./common";
import { toRange } from "./common";

export const getSymbols = (document: TextDocument, parsed: Parsed): DocumentSymbol[] => {
    return [...symbolsOfEL(document, parsed.law)];
};

function *symbolsOfEL(document: TextDocument, el: EL | string | null | undefined): Iterable<DocumentSymbol> {
    if (typeof el === "string" || !el) return;
    if (std.isLaw(el)) {
        const lawNum = el.children.find(std.isLawNum);
        const lawBody = el.children.find(std.isLawBody);
        const lawTitle = lawBody?.children.find(std.isLawTitle);
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, lawTitle?.range ?? lawNum?.range ?? (el.range && [el.range[0], el.range[0]]));
        const lawNumInParentheses = (
            lawNum?.text()
                ? (
                    /^[(（]/.exec(lawNum.text())
                        ? lawNum.text()
                        : `（${lawNum.text()}）`
                )
                : ""
        );
        const displayName = (lawTitle || lawNum) ? `${lawTitle?.text() ?? ""}${lawNumInParentheses}` : "";
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.File,
            range,
            selectionRange,
            children: [...symbolsOfEL(document, lawBody)]
        };
    } else if (std.isLawBody(el)) {
        for (const child of el.children) {
            if (std.isLawTitle(child)) continue;
            yield *symbolsOfEL(document, child);
        }
    } else if (std.isEnactStatement(el)) {
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, (el.range && [el.range[0], el.range[0]]));
        const displayName = `制定文「${el.text().slice(0, 10)}${el.text().length > 10 ? "…" : ""}」`;
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.EnumMember,
            range,
            selectionRange,
        };
    } else if (std.isTOC(el)) {
        const title = el.children.find(std.isTOCLabel);
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, title?.range ?? (el.range && [el.range[0], el.range[0]]));
        const displayName = title?.text() ?? "目次";
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.EnumMember,
            range,
            selectionRange,
        };
    } else if (std.isPreamble(el)) {
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
    } else if (std.isMainProvision(el)) {
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
    } else if (std.isArticleGroup(el)) {
        const title = (el.children as (typeof el.children)[number][]).find(std.isArticleGroupTitle);
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, title?.range ?? (el.range && [el.range[0], el.range[0]]));
        const displayName = title?.text() ?? "";
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.Namespace,
            range,
            selectionRange,
            children: (
                (el.children as (typeof el.children)[number][])
                    .filter(c => !std.isArticleGroupTitle(c))
                    .map(c => [...symbolsOfEL(document, c)])
                    .flat()
            ),
        };
    } else if (std.isSupplProvision(el)) {
        const title = el.children.find(std.isSupplProvisionLabel);
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
        const displayName = `${title?.text() ?? "附則"}${amendLawNumInParentheses}${el.attr.Extract ? "　抄" : ""}`;
        if (range && selectionRange) yield {
            name: displayName || `<${el.tag}>`,
            detail: displayName ? `<${el.tag}>` : undefined,
            kind: SymbolKind.Namespace,
            range,
            selectionRange,
            children: (
                el.children
                    .filter(c => !std.isSupplProvisionLabel(c))
                    .map(c => [...symbolsOfEL(document, c)])
                    .flat()
            ),
        };
    } else if (std.isArticle(el)) {
        const title = (el.children as (typeof el.children)[number][]).find(std.isArticleTitle);
        const caption = (el.children as (typeof el.children)[number][]).find(std.isArticleCaption);
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, title?.range ?? (el.range && [el.range[0], el.range[0]]));
        const displayName = `${title?.text() ?? ""}${caption?.text() ?? ""}`;
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
    } else if (std.isParagraphItem(el)) {
        const title = (el.children as (typeof el.children)[number][]).find(std.isParagraphItemTitle);
        const caption = (el.children as (typeof el.children)[number][]).find(std.isParagraphCaption);
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, title?.range ?? (el.range && [el.range[0], el.range[0]]));
        const displayName = `${title?.text() ?? ""}${caption?.text() ?? ""}`;
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
    } else if (std.isAppdxItem(el) || std.isSupplProvisionAppdxItem(el)) {
        const title = (el.children as (typeof el.children)[number][]).find(c => std.isAppdxItemTitle(c) || std.isSupplProvisionAppdxItemTitle(c)) as std.AppdxItemTitle | std.SupplProvisionAppdxItemTitle | undefined;
        const range = toRange(document, el.range);
        const selectionRange = toRange(document, title?.range ?? (el.range && [el.range[0], el.range[0]]));
        const displayName = `${title?.text() ?? ""}`;
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

