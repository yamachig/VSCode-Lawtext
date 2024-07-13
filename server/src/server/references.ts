import { isAppdxItem, isArticle, isArticleGroup, isArticleGroupTitle, isArticleTitle, isLaw, isLawBody, isLawNum, isLawTitle, isParagraphItem, isParagraphItemTitle, isSupplProvision, isSupplProvisionAppdxItem, isSupplProvisionAppdxItemTitle, isSupplProvisionLabel } from "lawtext/dist/src/law/std";
import type { Container } from "lawtext/dist/src/node/container";
import type { EL } from "lawtext/dist/src/node/el";
import type { ____PF } from "lawtext/dist/src/node/el/controls";
import type { ____VarRef } from "lawtext/dist/src/node/el/controls/varRef";
import type {
    Location,
    Position,
} from "vscode-languageserver";

import type {
    TextDocument
} from "vscode-languageserver-textdocument";

import type { Parsed } from "./common";

export const getReferences = (document: TextDocument, parsed: Parsed, position: Position): Location[] => {
    const offset = document.offsetAt(position);
    const { variableReferences, declarations, containers, pointerEnvByEL } = parsed;
    const locations: Location[] = [];

    const varRefs = new Set<____VarRef>();

    for (const varRef of variableReferences) {
        if (varRef.range && varRef.range[0] <= offset && offset < varRef.range[1]) {
            const nameRange = declarations.get(varRef.attr.declarationID).range;
            if (nameRange) {
                locations.push({
                    uri: document.uri,
                    range: {
                        start: document.positionAt(nameRange[0]),
                        end: document.positionAt(nameRange[1]),
                    },
                });
            }
            for (const v of variableReferences.filter(r => r.attr.declarationID === varRef.attr.declarationID)) {
                varRefs.add(v);
            }
            break;
        }
    }

    for (const decl of declarations.db.values()) {
        if (decl.range && decl.range[0] <= offset && offset < decl.range[1]) {
            locations.push({
                uri: document.uri,
                range: {
                    start: document.positionAt(decl.range[0]),
                    end: document.positionAt(decl.range[1]),
                },
            });
            for (const v of variableReferences.filter(r => r.attr.declarationID === decl.attr.declarationID)) {
                varRefs.add(v);
            }
            break;
        }
    }

    for (const varRef of varRefs) {
        if (varRef.range) {
            locations.push({
                uri: document.uri,
                range: {
                    start: document.positionAt(varRef.range[0]),
                    end: document.positionAt(varRef.range[1]),
                },
            });
        }
    }

    const fragments = new Set<{fragment: ____PF, containers: Container[]}>();

    const allFragments = [...pointerEnvByEL.values()].map(p => p.located?.type === "internal" ? p.located.fragments : []).flat();

    for (const pointerEnv of pointerEnvByEL.values()) {

        if (!pointerEnv.located || pointerEnv.located.type !== "internal") continue;

        for (const { fragment, containers } of pointerEnv.located.fragments) {
            if (!fragment.range) continue;
            if (!(fragment.range[0] <= offset && offset < fragment.range[1])) continue;
            for (const container of containers) {
                if (!container || !container.el.range) continue;
                locations.push({
                    uri: document.uri,
                    range: {
                        start: document.positionAt(container.el.range[0]),
                        end: document.positionAt(container.el.range[1]),
                    },
                });
                for (const f of allFragments.filter(r => r.containers.includes(container))) {
                    fragments.add(f);
                }
            }
        }
    }


    for (const { fragment, containers } of allFragments) {
        if (!fragment.range) continue;
        if (!(fragment.range[0] <= offset && offset < fragment.range[1])) continue;
        for (const container of containers){
            if (!container || !container.el.range) continue;
            locations.push({
                uri: document.uri,
                range: {
                    start: document.positionAt(container.el.range[0]),
                    end: document.positionAt(container.el.range[1]),
                },
            });
            for (const f of allFragments.filter(r => r.containers.includes(container))) {
                fragments.add(f);
            }
        }
        break;
    }

    for (const container of containers.values()) {
        const containerTitles: EL[] = [];

        if (isLaw(container.el)) {
            const lawTitle = container.el.children.find(isLawBody)?.children.find(isLawTitle);
            if (lawTitle) containerTitles.push(lawTitle);
            const lawNum = container.el.children.find(isLawNum);
            if (lawNum) containerTitles.push(lawNum);
        } else if (isSupplProvision(container.el)) {
            const supplProvisionLabel = container.el.children.find(isSupplProvisionLabel);
            if (supplProvisionLabel) containerTitles.push(supplProvisionLabel);
        } else if (isArticleGroup(container.el)) {
            const articleGroupTitle = (container.el.children as (typeof container.el.children)[number][]).find(isArticleGroupTitle);
            if (articleGroupTitle) containerTitles.push(articleGroupTitle);
        } else if (isAppdxItem(container.el) || isSupplProvisionAppdxItem(container.el)) {
            const appdxItemTitle = (container.el.children as (typeof container.el.children)[number][]).find(c => isArticleGroupTitle(c) || isSupplProvisionAppdxItemTitle(c));
            if (appdxItemTitle) containerTitles.push(appdxItemTitle);
        } else if (isArticle(container.el)) {
            const articleTitle = container.el.children.find(isArticleTitle);
            if (articleTitle) containerTitles.push(articleTitle);
        } else if (isParagraphItem(container.el)) {
            const paragraphItemTitle = (container.el.children as (typeof container.el.children)[number][]).find(isParagraphItemTitle);
            if (paragraphItemTitle) containerTitles.push(paragraphItemTitle);
        }

        for (const containerTitle of containerTitles) {
            if (containerTitle.range && containerTitle.range[0] <= offset && offset < containerTitle.range[1]) {
                locations.push({
                    uri: document.uri,
                    range: {
                        start: document.positionAt(containerTitle.range[0]),
                        end: document.positionAt(containerTitle.range[1]),
                    },
                });
                for (const f of allFragments.filter(r => r.containers.includes(container))) {
                    fragments.add(f);
                }
            }
        }
    }

    for (const { fragment } of fragments) {
        if (fragment.range) {
            locations.push({
                uri: document.uri,
                range: {
                    start: document.positionAt(fragment.range[0]),
                    end: document.positionAt(fragment.range[1]),
                },
            });
        }
    }

    return locations;
};
