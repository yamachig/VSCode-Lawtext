import { EL, JsonEL, loadEl } from "lawtext/dist/src/node/el";
import { HTMLOptions } from "lawtext/dist/src/renderer/common/html";
import { omit } from "lawtext/dist/src/util";

export interface PreviewerStateJSON {
    els: JsonEL[],
    htmlOptions: {
        figDataMap?: Record<string, {url: string, type: string}>;
        renderControlEL?: boolean;
        renderPDFAsLink?: boolean;
    },
    scrollOffset: number;
}

export interface PreviewerState {
    els: EL[],
    htmlOptions: HTMLOptions,
    scrollOffset: number;
}

export const toStateJSON = (state: PreviewerState): PreviewerStateJSON => {
    const htmlOptions: PreviewerStateJSON["htmlOptions"] = {
        ...omit(state.htmlOptions, "getFigData"),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const figDataMap = (state.htmlOptions.getFigData as any)?.figDataMap;
    if (figDataMap) {
        htmlOptions.figDataMap = figDataMap;
    }
    return {
        ...state,
        els: state.els.map(el => el.json(true, true)),
        htmlOptions,
    };
};

export const toState = (stateJSON: PreviewerStateJSON): PreviewerState => {
    const getFigData = (
        stateJSON.htmlOptions.figDataMap
        && ((src: string) => (stateJSON.htmlOptions.figDataMap?.[src] ?? null))
    );
    if (getFigData && stateJSON.htmlOptions.figDataMap) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (getFigData as any).figDataMap = stateJSON.htmlOptions.figDataMap;
    }

    return {
        ...stateJSON,
        els: stateJSON.els.map(loadEl),
        htmlOptions: {
            ...omit(stateJSON.htmlOptions, "figDataMap"),
            getFigData,
        },
    };
};
