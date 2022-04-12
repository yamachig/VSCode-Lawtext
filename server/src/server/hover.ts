import {
    Hover,
    Position,
    Range,
} from "vscode-languageserver";

import {
    TextDocument
} from "vscode-languageserver-textdocument";

import { EL } from "lawtext/dist/src/node/el";
import * as std from "lawtext/dist/src/law/std";
import { Parsed } from "./common";

export const getHover = (document: TextDocument, parsed: Parsed, position: Position): Hover | null => {
    const offset = document.offsetAt(position);
    const { law, virtualLines: vls } = parsed;
    const mdLines: string[] = [];

    let range: Range | undefined = undefined;

    const tags: string[] = [];
    let nextEL: EL | null = law;
    let el: EL | null = null;
    let lastStdEL: std.StdEL | null = law;
    tags.push(nextEL.tag);
    while (nextEL) {
        el = nextEL as EL;
        if (std.isStdEL(el)) lastStdEL = el;

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
    const attrsStr = Object.entries(lastStdEL?.attr ?? {}).map(([k, v]) => `${k}="${v}"`).join(" ");
    mdLines.push(`**&lt;${lastStdEL.tag}${attrsStr ? " " + attrsStr : ""}&gt;**`);
    mdLines.push(`- ${tags.join(" &gt; ")}`);

    if (el !== lastStdEL && lastStdEL.range) {
        const range = lastStdEL.range;
        const posRange = [
            document.positionAt(range[0]),
            document.positionAt(range[1]),
        ];
        const posRangeStr = `L${posRange[0].line + 1} C${posRange[0].character + 1} - L${posRange[1].line + 1} C${posRange[1].character + 1}`;
        mdLines.push(`- Range of ${lastStdEL && lastStdEL.tag}: [${range[0]}:${range[1]}] = ${posRangeStr}`);
    }

    if (el?.range) {
        const range = el.range;
        const posRange = [
            document.positionAt(range[0]),
            document.positionAt(range[1]),
        ];
        const posRangeStr = `L${posRange[0].line + 1} C${posRange[0].character + 1} - L${posRange[1].line + 1} C${posRange[1].character + 1}`;
        mdLines.push(`- Range of ${el && el.tag}: [${range[0]}:${range[1]}] = ${posRangeStr}`);
    }

    for (const vl of vls) {
        if (!("line" in vl) || !vl.line.range) continue;
        if (vl.line.range[0] <= offset && offset < vl.line.range[1]) {

            const rangeTexts = vl.line.rangeTexts();
            let part: [range: [start: number, end: number] | null, text: string, description: string] | null = null;
            for (const _part of rangeTexts) {
                const [tRange] = _part;
                if (tRange && tRange[0] <= offset && offset < tRange[1]) {
                    part = _part;
                    break;
                }
            }

            const partStr = part ? ` part \`"${part[2]}"\`` : "";
            mdLines.push(`**Line type \`"${vl.type}"\`${partStr}**`);
            {
                const range = vl.line.range;
                const posRange = [
                    document.positionAt(range[0]),
                    document.positionAt(range[1]),
                ];
                const posRangeStr = `L${posRange[0].line + 1} C${posRange[0].character + 1} - L${posRange[1].line + 1} C${posRange[1].character + 1}`;
                mdLines.push(`- Range of ${vl.type}: [${range[0]}:${range[1]}] = ${posRangeStr}`);
            }

            if (part?.[0]) {
                const range = part[0];
                const posRange = [
                    document.positionAt(range[0]),
                    document.positionAt(range[1]),
                ];
                const posRangeStr = `L${posRange[0].line + 1} C${posRange[0].character + 1} - L${posRange[1].line + 1} C${posRange[1].character + 1}`;
                mdLines.push(`- Range of \`"${part[2]}"\`: [${range[0]}:${range[1]}] = ${posRangeStr}`);
            }

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

