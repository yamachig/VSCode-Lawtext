
export interface ActionCounter {
    scroll: number;
}

export const scrollToOffset = (offset: number, counter: ActionCounter) => {
    console.log(`scrollToOffset: ${offset}`);
    const rangeInfo = {
        start: {
            d: null as number | null,
            top: 0,
        },
        end: {
            d: null as number | null,
            top: null as number | null,
        },
    };
    for (const el of Array.from(document.querySelectorAll("[data-lawtext_range]"))) {
        const range = JSON.parse((el as HTMLElement).dataset["lawtext_range"] ?? "");
        if (!range) return;
        const relStart = range[0] - offset;
        const relEnd = range[1] - offset;
        const rect = el.getBoundingClientRect();
        const [startTop, startD] = relEnd <= 0 ? [rect.bottom, relEnd] : [rect.top, relStart];
        const [endTop, endD] = relStart >= 0 ? [rect.top, relStart] : [rect.bottom, relEnd];
        if (startD <= 0 && ((rangeInfo.start.d === null) || (rangeInfo.start.d < startD))) {
            rangeInfo.start.top = startTop;
            rangeInfo.start.d = startD;
        }
        if (0 <= endD && ((rangeInfo.end.d === null) || (endD < rangeInfo.end.d))) {
            rangeInfo.end.top = endTop;
            rangeInfo.end.d = endD;
        }
    }
    if ((rangeInfo.start.d === null) || (rangeInfo.end.d === null) || (rangeInfo.end.top === null)) return;
    const r = -rangeInfo.start.d / (rangeInfo.end.d - rangeInfo.start.d);
    const top = rangeInfo.start.top + r * (rangeInfo.end.top - rangeInfo.start.top);
    const scrollEL = document.querySelector("html");
    if (!scrollEL) return;
    const scrollELRect = scrollEL.getBoundingClientRect();
    const newScrollTop = (top - scrollELRect.top) - window.innerHeight / 2;
    if (!Number.isFinite(newScrollTop)) return;

    counter.scroll += 1;
    scrollEL.scrollTop = newScrollTop;
};


export const getCenterOffset = (visibleELs: Set<HTMLElement>) => {
    const scrollEL = document.querySelector("html");
    if (!scrollEL) return;
    const centerHeight = window.innerHeight / 2;
    const rangeInfo = {
        start: {
            offset: 0,
            y: null as number | null,
        },
        end: {
            offset: null as number | null,
            y: null as number | null,
        },
    };
    for (const el of visibleELs) {
        const range = JSON.parse(el.dataset["lawtext_range"] ?? "");
        if (!range) continue;
        const rect = el.getBoundingClientRect();
        const relTop = rect.top - centerHeight;
        const relBottom = rect.bottom - centerHeight;
        const [startY, startOffset] = relBottom <= 0 ? [relBottom, range[1]] : [relTop, range[0]];
        const [endY, endOffset] = relTop >= 0 ? [relTop, range[0]] : [relBottom, range[1]];
        if (startY <= 0 && ((rangeInfo.start.y === null) || (rangeInfo.start.y < startY))) {
            rangeInfo.start.offset = startOffset;
            rangeInfo.start.y = startY;
        }
        if (0 <= endY && ((rangeInfo.end.y === null) || (endY < rangeInfo.end.y))) {
            rangeInfo.end.offset = endOffset;
            rangeInfo.end.y = endY;
        }
    }
    if ((rangeInfo.start.y === null) || (rangeInfo.end.y === null) || (rangeInfo.end.offset === null)) return;
    const r = -rangeInfo.start.y / (rangeInfo.end.y - rangeInfo.start.y);
    const offset = Math.round(rangeInfo.start.offset + r * (rangeInfo.end.offset - rangeInfo.start.offset));
    if (!Number.isFinite(offset)) return;
    return offset;
};
