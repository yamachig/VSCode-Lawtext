import { EL, JsonEL, loadEl } from "lawtext/dist/src/node/el";
import preview, { getFigDataMapWithDocument } from "../preview";

export const previewEL = (elOrJsonEL: EL | JsonEL, documentURIStr?: string) => {
    const el = elOrJsonEL instanceof EL ? elOrJsonEL : loadEl(elOrJsonEL);
    const figDataMap = documentURIStr ? getFigDataMapWithDocument(el, documentURIStr) : undefined;
    return preview({ el, figDataMap });
};

export default previewEL;
