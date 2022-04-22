import { redis } from "../../../utils/redis.js";
import { dump, load } from "../presentation/index.js";
import { getLogger } from "koa-es-template";

const logger = getLogger('CAC-CACHE')
const getCached = async cacLinkKey => {
    const cachedCacKey = await redis.get(cacLinkKey)
    if (!cachedCacKey) return
    const cached = await redis.get(cachedCacKey)
    if (cached) return load(cached)
}

export const setToCache = (config, cacLinkKey) => {
    const dumped = dump(config)
    const cacKey = `{cac}:${config.kind}:${config.name}:${config.metadata.version}`
    redis.set(cacLinkKey, cacKey)
    redis.set(cacKey, dumped)
}

export const getCacLinkKey = (kind, name, ref) => ref ? `{cac_link}:${kind}:${name}:${ref}` : `{cac_link}:${kind}:${name}`;

export const removeCacLinkKey = (kind, name, ref) => redis.unlink(getCacLinkKey(kind, name, ref));

export const getOne = async (kind, name, ref, fallback) => {
    const cacLinkKey = getCacLinkKey(kind, name, ref)

    const cached = await getCached(cacLinkKey)
    if (cached) {
        logger.info('Cache hit.')
        return cached
    }

    logger.info('Cache missed.')
    const config = await fallback(kind, name, ref)
    setToCache(config, cacLinkKey)
    return config
}

