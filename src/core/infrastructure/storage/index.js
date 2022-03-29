import { deleteContent, getBranch, getFile, getRepository, getTree, saveFile } from "./github/api.js";
import { format, safeDump, safeLoad } from "../presentation/index.js";
import { owner, repo } from "./github/clients/index.js";
import { getLogger } from "koa-es-template";
import * as cache from '../cache/index.js'
import { decodeBase64 } from "../../../utils/encode.js";

const logger = getLogger('STORAGE')

const getFilePath = (kind, name) => getKindPath(kind, `${name}.${format}`)
const getKindPath = (kind, path) => `${kind}/${path}`

const getName = (kind, kindPath) => kindPath.substring(kind.length + 1, kindPath.length - format.length - 1)

const getLatestCommitSha = async (owner, repo) => {
    const defaultBranch = await getDefaultBranch(owner, repo)
    const { commit } = await getBranch(owner, repo, defaultBranch)
    return commit.id
}

/**
 * 读文件内容
 * @param owner
 * @param repo
 * @param filepath
 * @param ref 分支名、标签名、CommitID
 * @return {Promise<{ref:string, content:string}>}
 */
export const readFile = async (owner, repo, filepath, ref = undefined) => {
    const sha = await getLatestCommitSha(owner, repo)
    if (ref !== sha) ref = sha
    const content = await readFileContent(owner, repo, filepath, ref)
    return { ref, content }
}


/**
 * 删除文件
 * @param owner
 * @param repo
 * @param filepath
 * @param operator
 * @return {Promise<void>}
 */
export const deleteFile = async (owner, repo, filepath, operator) => {
    let { sha } = await getFile(owner, repo, filepath)
    await deleteContent(owner, repo, filepath, sha, operator);
}

export const readFileContent = async (owner, repo, filepath, ref = undefined) => {
    const { content } = await getFile(owner, repo, filepath, ref)
    return decodeBase64(content)
}

export const readFiles = async (owner, repo, ...paths) => Promise.all(paths.map(path => readFileContent(owner, repo, path)))

/**
 * 获取根树
 * @param owner
 * @param repo
 * @param ref
 * @return {Promise<*|undefined>}
 */
export const getRootTree = (owner, repo, ref) => getTree(owner, repo, ref)

/**
 * 获取树下某个目录中的文件
 * @param tree
 * @param dir
 * @return {*}
 */
export const getTreeFiles = (tree, dir = '') =>
    tree.tree.filter(({ type, path }) => type === 'blob' && path.startsWith(dir))

/**
 * 获取仓库默认分支
 * @param owner
 * @param repo
 * @return {Promise<*>}
 */
export const getDefaultBranch = async (owner, repo) => {
    const { default_branch: defaultBranch } = await getRepository(owner, repo)
    return defaultBranch
}


export const getTreeFilePaths = async (owner, repo, dir = '') => {
    const fallback = async () => {
        const defaultBranch = await getDefaultBranch(owner, repo)
        const { tree } = await getRootTree(owner, repo, defaultBranch)
        return tree.filter(({ type }) => type === 'blob').map(({ path }) => path)
    }

    return cache.getPaths(owner, repo, dir, fallback)
}

export const find = async (kind, prefix) => {
    const paths = await getTreeFilePaths(owner, repo, getKindPath(kind, prefix))
    return Promise.all(paths.map(
        async path => {
            const name = getName(kind, path)
            const { metadata } = await getOne(kind, name)
            return { kind, name, metadata }
        }
    ))
};

export const getOne = async (kind, name, ref) => {
    const fallback = async () => {
        const result = await readFile(owner, repo, getFilePath(kind, name), ref)
        const config = safeLoad(result.content)
        config.metadata.version = result.ref
        return config
    };
    return await cache.getOne(kind, name, ref, fallback)
};


export const save = ({ kind, name, metadata, spec }, operator) =>
    saveFile(owner, repo, getFilePath(kind, name), safeDump({ kind, name, metadata, spec }), operator)
        .then(() => {
            cache.removeCacLinkKey(kind, name)
            cache.addPath(owner, repo, getFilePath(kind, name))
        });


export const removeOne = (kind, name, operator) =>
    deleteFile(owner, repo, getFilePath(kind, name), operator)
        .then(() => {
            cache.removeCacLinkKey(kind, name)
            cache.removePath(owner, repo, getFilePath(kind, name))
        });
