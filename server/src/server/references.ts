import { isAppdxItem, isArticle, isArticleGroup, isArticleGroupTitle, isArticleTitle, isLaw, isLawBody, isLawNum, isLawTitle, isParagraphItem, isParagraphItemTitle, isSupplProvision, isSupplProvisionAppdxItem, isSupplProvisionAppdxItemTitle, isSupplProvisionLabel } from "lawtext/dist/src/law/std";
import { EL } from "lawtext/dist/src/node/el";
import { ____PF } from "lawtext/dist/src/node/el/controls";
import { ____VarRef } from "lawtext/dist/src/node/el/controls/varRef";
import {
    Location,
    Position,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { Parsed } from "./common";

export const getReferences = (document: TextDocument, parsed: Parsed, position: Position): Location[] => {
    const offset = document.offsetAt(position);
    const { variableReferences, declarations, pointerRangesList, containers } = parsed;
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

    const fragments = new Set<____PF>();

    const allFragments = pointerRangesList.map(l => l.ranges()).flat().map(r => r.pointers()).flat().map(p => p.fragments()).flat();

    for (const fragment of allFragments) {
        if (!fragment.range) continue;
        if (!(fragment.range[0] <= offset && offset < fragment.range[1])) continue;
        for (const containerID of fragment.targetContainerIDs){
            const container = containers.get(containerID);
            if (!container || !container.el.range) continue;
            locations.push({
                uri: document.uri,
                range: {
                    start: document.positionAt(container.el.range[0]),
                    end: document.positionAt(container.el.range[1]),
                },
            });
            for (const f of allFragments.filter(r => r.attr.targetContainerIDs?.includes(containerID))) {
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
                for (const f of allFragments.filter(r => r.attr.targetContainerIDs?.includes(container.containerID))) {
                    fragments.add(f);
                }
            }
        }
    }

    for (const fragment of fragments) {
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
