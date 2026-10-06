import { EL } from "lawtext/node/el/index";
import type { JsonEL } from "lawtext/node/el/jsonEL";
import { loadEL } from "lawtext/node/el/loadEL";
import preview, { getFigDataMapWithDocument } from "../preview.ts";

export const previewEL = (elOrJsonEL: EL | JsonEL, documentURIStr?: string) => {
    const el = elOrJsonEL instanceof EL ? elOrJsonEL : loadEL(elOrJsonEL);
    const figDataMap = documentURIStr ? getFigDataMapWithDocument(el, documentURIStr) : undefined;
    return preview({ el, figDataMap });
};

export default previewEL;
