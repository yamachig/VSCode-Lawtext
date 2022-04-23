import { EL } from "lawtext/dist/src/node/el";
import { JsonEL } from "lawtext/dist/src/node/el/jsonEL";
import { loadEL } from "lawtext/dist/src/node/el/loadEL";
import preview, { getFigDataMapWithDocument } from "../preview";

export const previewEL = (elOrJsonEL: EL | JsonEL, documentURIStr?: string) => {
    const el = elOrJsonEL instanceof EL ? elOrJsonEL : loadEL(elOrJsonEL);
    const figDataMap = documentURIStr ? getFigDataMapWithDocument(el, documentURIStr) : undefined;
    return preview({ el, figDataMap });
};

export default previewEL;
