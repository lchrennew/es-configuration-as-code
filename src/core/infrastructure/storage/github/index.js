import { deleteFile, getTreeFilePaths, readFile, readFiles, readTreeFiles, saveFile } from "./api.js";
import { dump, load } from "../../presentation/index.js";
import { owner, repo } from './clients/index.js'
import { getLogger } from "koa-es-template";

const logger = getLogger('GithubStorage')
