import { deleteFile, getTreeFilePaths, readFile, readFiles, saveFile } from "./github/api.js";
import { dump, format, load } from "../presentation/index.js";
import { owner, repo } from "./github/clients/index.js";
import { getLogger } from "koa-es-template";

export const save = async ({ kind, name, metadata, spec }, operator) => {
    const path = `${kind}/${name}.${format}`
    await saveFile(owner, repo, path, dump({ kind, name, metadata, spec }), operator)
};


const logger = getLogger('STORAGE')

export const find = async (kind, prefix) => {
    const path = `${kind}/${prefix}`
    const paths = await getTreeFilePaths(owner, repo, path)
    const contents = await readFiles(owner, repo, ...paths)
    return contents.map(content => {
        const { name, metadata } = load(content)
        return { name, metadata }
    })
};


export const getOne = async (kind, name, ref) => {
    const path = `${kind}/${name}.${format}`
    try {
        const result = await readFile(owner, repo, path, ref)
        return { ref: result.ref, config: load(result.content) }
    } catch (error) {
        logger.error(error)
    }
}

export const removeOne = async (kind, name, operator) => {
    const path = `${kind}/${name}.${format}`
    await deleteFile(owner, repo, path, operator)
}
