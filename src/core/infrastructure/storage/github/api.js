import * as github from './clients/index.js'
import { useParams } from './clients/index.js'
import { json } from "es-fetch-api/middlewares/body.js";
import { DELETE, POST, PUT } from "es-fetch-api/middlewares/methods.js";
import { decodeBase64, encodeBase64 } from "../../../../utils/encode.js";
import * as apiPath from "./api-path.js";
import { query } from "es-fetch-api/middlewares/query.js";
import { getLogger } from 'koa-es-template';

const logger = getLogger('GITHUB API')

/**
 * 获取文件
 * @param owner
 * @param repo
 * @param filepath
 * @param ref <string?>
 * @return {Promise<*>}
 */
export const getFile = async (owner, repo, filepath, ref = undefined) => {
    const data = await github.api(apiPath.contents, useParams({ owner, repo, filepath }), query({ ref }));
    if (data instanceof Array && !data.length) throw { status: 404, message: 'file not found' }
    return data
}

/**
 * 更新文件
 * @param owner
 * @param repo
 * @param filepath
 * @param content
 * @param sha
 * @param operator
 * @return {Promise<*|undefined>}
 */
export const updateFile = ({ owner, repo, filepath, content, sha, operator }) =>
    github.api(
        apiPath.contents,
        PUT,
        useParams({ owner, repo, filepath }),
        json({ content, sha, message: `${operator} updated ${filepath}` }))

/**
 * 创建文件
 * @param owner
 * @param repo
 * @param filepath
 * @param content
 * @param operator
 * @return {Promise<*|undefined>}
 */
export const createFile = ({ owner, repo, filepath, content, operator }) =>
    github.api(
        apiPath.contents,
        POST,
        useParams({ owner, repo, filepath }),
        json({ content, message: `${operator} created ${filepath}` })
    )

/**
 * 保存文件（如果不存在创建，如果存在更新）
 * @param owner
 * @param repo
 * @param filepath
 * @param content
 * @param operator
 * @return {Promise<void>}
 */
export const saveFile = async (owner, repo, filepath, content, operator) => {
    let file
    const base64 = encodeBase64(content)
    try {
        file = await getFile(owner, repo, filepath)
    } catch (getFileError) {
        if (getFileError.status === 404) {
            try {
                await createFile({ owner, repo, filepath, content: base64, operator })
            } catch (createFileError) {
                if (createFileError.status === 404) {
                    await updateFile({ owner, repo, filepath, content: base64, operator })
                } else throw createFileError
            }
        } else throw getFileError
    }
    if (file?.sha) {
        await updateFile({ owner, repo, filepath, content: base64, sha: file.sha, operator })
    }
}

/**
 * 删除内容
 * @param owner
 * @param repo
 * @param filepath
 * @param sha
 * @param operator
 * @return {Promise<*|undefined>}
 */
const deleteContent = (owner, repo, filepath, sha, operator) =>
    github.api(
        apiPath.contents,
        DELETE,
        useParams({ owner, repo, filepath }), json({ sha, message: `${operator} deleted ${filepath}` }));

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

export const readFileContent = async (owner, repo, filepath, ref = undefined) => {
    const { content } = await getFile(owner, repo, filepath, ref)
    return decodeBase64(content)
}

/**
 * 获取二进制对象
 * @param owner
 * @param repo
 * @param sha
 * @return {Promise<*|undefined>}
 */
export const getBlob = async (owner, repo, sha) =>
    github.api(apiPath.blob, useParams({ owner, repo, sha }))

/**
 * 获取仓库信息
 * @param owner
 * @param repo
 * @return {Promise<*|undefined>}
 */
const getRepository = (owner, repo) => github.api('repos/:owner/:repo', useParams({ owner, repo }))

/**
 * 获取仓库默认分支
 * @param owner
 * @param repo
 * @return {Promise<*>}
 */
const getDefaultBranch = async (owner, repo) => {
    const { default_branch: defaultBranch } = await getRepository(owner, repo)
    return defaultBranch
}

const getBranch = (owner, repo, branch) =>
    github.api('repos/:owner/:repo/branches/:branch', useParams({ owner, repo, branch }))

const getLatestCommitSha = async (owner, repo) => {
    const defaultBranch = await getDefaultBranch(owner, repo)
    const { commit } = await getBranch(owner, repo, defaultBranch)
    return commit.id
}

/**
 * 获取树
 * @param owner
 * @param repo
 * @param sha
 * @param recursive
 * @return {Promise<*|undefined>}
 */
export const getTree = (owner, repo, sha, recursive = true) =>
    github.api(apiPath.tree, useParams({ owner, repo, sha }), query({ recursive }))

/**
 * 获取根树
 * @param owner
 * @param repo
 * @param ref
 * @return {Promise<*|undefined>}
 */
const getRootTree = (owner, repo, ref) => getTree(owner, repo, ref)

/**
 * 获取树下某个目录中的文件
 * @param tree
 * @param dir
 * @return {*}
 */
const getTreeFiles = (tree, dir = '') =>
    tree.tree.filter(({ type, path }) => type === 'blob' && path.startsWith(dir))

const readBlob = async (owner, repo, sha) => {
    const blob = await getBlob(owner, repo, sha)
    return decodeBase64(blob.content)
}

export const readTreeFiles = async (owner, repo, dir = '') => {
    const tree = await getRootTree(owner, repo)
    const treeFiles = await getTreeFiles(tree, dir)
    return await Promise.all(treeFiles.map(({ sha }) => readBlob(owner, repo, sha)))
}

export const getTreeFilePaths = async (owner, repo, dir = '') => {
    const defaultBranch = await getDefaultBranch(owner, repo)
    const tree = await getRootTree(owner, repo, defaultBranch)
    const treeFiles = await getTreeFiles(tree, dir)
    return treeFiles.map(({ path }) => path)
}

export const readFiles = async (owner, repo, ...paths) => Promise.all(paths.map(path => readFileContent(owner, repo, path)))

