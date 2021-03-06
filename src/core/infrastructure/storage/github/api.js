import * as github from './clients/index.js'
import { useParams } from './clients/index.js'
import { json } from "es-fetch-api/middlewares/body.js";
import { DELETE, POST, PUT } from "es-fetch-api/middlewares/methods.js";
import { encodeBase64 } from "../../../../utils/encode.js";
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
                return await createFile({ owner, repo, filepath, content: base64, operator })
            } catch (createFileError) {
                if (createFileError.status === 404) {
                    return await updateFile({ owner, repo, filepath, content: base64, operator })
                } else throw createFileError
            }
        } else throw getFileError
    }
    if (file?.sha) {
        return await updateFile({ owner, repo, filepath, content: base64, sha: file.sha, operator })
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
export const deleteContent = (owner, repo, filepath, sha, operator) =>
    github.api(
        apiPath.contents,
        DELETE,
        useParams({ owner, repo, filepath }), json({ sha, message: `${operator} deleted ${filepath}` }));

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
export const getRepository = (owner, repo) =>
    github.api('repos/:owner/:repo', useParams({ owner, repo }))


export const getBranch = (owner, repo, branch) =>
    github.api('repos/:owner/:repo/branches/:branch', useParams({ owner, repo, branch }))


/**
 * 获取树
 * @param owner
 * @param repo
 * @param sha
 * @param recursive
 * @return {Promise<*|undefined>}
 */
export const getTree = (owner, repo, sha, recursive = 1) =>
    github.api(apiPath.tree, useParams({ owner, repo, sha }), query({ recursive }))
