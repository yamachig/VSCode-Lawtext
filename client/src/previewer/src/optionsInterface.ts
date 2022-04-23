import { JsonEL } from "lawtext/dist/src/node/el/jsonEL";

export interface PreviewerOptions {
    els?: JsonEL[],
    htmlOptions?: {
        figDataMap?: Record<string, {url: string, type: string}>;
        renderControlEL?: boolean;
        renderPDFAsLink?: boolean;
    },
    centerOffset?: number;
}
