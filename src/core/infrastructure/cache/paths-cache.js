import { redis } from "../../../utils/redis.js";

const scanPaths = async (key, match, count = 0) => {
    let cursor = '0'
    const result = []
    do {
        const [ nextCursor, values ] = await redis.sscan(key, cursor, ...(match ? [ 'MATCH', match ] : []), ...(count ? [ 'COUNT', count ] : []))
        cursor = nextCursor
        result.push(...values)
    } while (cursor !== '0')
    return result
}

const getKey = (owner, repo) => `{cac_paths}:${owner}:${repo}`

/**
 * 获取文件路径
 * @param owner
 * @param repo
 * @param dir
 * @param fallback
 * @return {Promise<*[]|*>}
 */
export const getPaths = async (owner, repo, dir, fallback) => {
    const pathsKey = getKey(owner, repo)
    const exists = await redis.exists(pathsKey)
    if (!exists) {
        const paths = await fallback()
        await redis.sadd(pathsKey, ...paths)
        return paths.filter(path => path.startsWith(dir))
    }
    return scanPaths(getKey(owner, repo), `${dir}*`)
};

export const addPath = (owner, repo, path) => redis.sadd(getKey(owner, repo), path);

export const removePath = (owner, repo, path) => redis.srem(getKey(owner, repo), path)

