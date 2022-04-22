import { getLogger } from "koa-es-template";
import { addPath, getPaths, removePath } from "./paths-cache.js";
import { getOne, removeCacLinkKey, setToCache, getCacLinkKey } from "./cac-cache.js";


const logger = getLogger('CACHE')
export {
    addPath, getPaths, removePath,
    getOne, removeCacLinkKey, setToCache, getCacLinkKey
}

