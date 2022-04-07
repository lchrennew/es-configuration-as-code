import { redis } from "../../../utils/redis.js";
import { dump, load } from "../presentation/index.js";

const getCached = async cacLinkKey => {
    const cachedCacKey = await redis.get(cacLinkKey)
    if (!cachedCacKey) return
    const cached = await redis.get(cachedCacKey)
    if (cached) return load(cached)
}

const setToCache = (kind, name, config, cacLinkKey) => {
    const dumped = dump(config)
    const cacKey = `{cac}:${kind}:${name}:${config.ref}`
    redis.set(cacLinkKey, cacKey)
    redis.set(cacKey, dumped)
}

const getCacLinkKey = (kind, name, ref) => ref ? `{cac_link}:${kind}:${name}:${ref}` : `{cac_link}:${kind}:${name}`;

export const removeCacLinkKey = (kind, name, ref) => redis.unlink(getCacLinkKey(kind, name, ref));

export const getOne = async (kind, name, ref, fallback) => {
    const cacLinkKey = getCacLinkKey(kind, name, ref)

    const cached = await getCached(cacLinkKey)
    if (cached) return cached

    const config = await fallback(kind, name, ref)
    setToCache(kind, name, config, cacLinkKey)
    return config
}

