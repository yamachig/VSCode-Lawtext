import {
    Hover,
    Position,
    Range,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { parse } from "lawtext/dist/src/parser/lawtext";
import { EL } from "lawtext/dist/src/node/el";

export const getHover = (document: TextDocument, parsed: ReturnType<typeof parse>, position: Position): Hover | null => {
    const offset = document.offsetAt(position);
    const { value: law, virtualLines: vls } = parsed;
    const mdLines: string[] = [];

    let range: Range | undefined = undefined;

    const tags: string[] = [];
    let nextEL: EL | null = law;
    tags.push(nextEL.tag);
    while (nextEL) {
        const el = nextEL as EL;
        nextEL = null;
        const tagsCount = new Map<string, number>();
        for (const child of el.children) {
            if (typeof child === "string") continue;
            tagsCount.set(child.tag, (tagsCount.get(child.tag) ?? 0) + 1);
            if (child.range && child.range[0] <= offset && offset < child.range[1]) {
                nextEL = child;
                const count = tagsCount.get(child.tag) ?? 1;
                tags.push(count > 1 ? `${child.tag}[${count}]` : child.tag);
                range = {
                    start: document.positionAt(child.range[0]),
                    end: document.positionAt(child.range[1]),
                };
                break;
            }
        }
    }
    mdLines.push(`- *Element*: ${tags.join(" > ")}`);

    for (const vl of vls) {
        if (!("line" in vl) || !vl.line.range) continue;
        if (vl.line.range[0] <= offset && offset < vl.line.range[1]) {
            const rangeTexts = vl.line.rangeTexts();
            const lineInfos: string[] = [];
            lineInfos.push(`type: \`"${vl.type}"\``);
            for (const [tRange,, tDescription] of rangeTexts) {
                if (tRange && tRange[0] <= offset && offset < tRange[1]) {
                    lineInfos.push(`part: \`"${tDescription}"\``);
                    break;
                }
            }
            mdLines.push(`- *Line* ${lineInfos.join("; ")}`);
            break;
        }
    }

    return {
        contents: {
            kind: "markdown",
            value: mdLines.join("\n")
        },
        range,
    };
};

