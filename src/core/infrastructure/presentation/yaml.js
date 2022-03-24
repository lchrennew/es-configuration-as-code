import { dump, load } from "js-yaml";

export const parse = content => load(content)

/**
 *
 * @return {*}
 * @param object
 */
export const stringify = object => dump(object)
