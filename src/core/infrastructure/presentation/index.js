export const format = process.env.PRESENTATION_FORMAT ?? 'yaml'

const { parse, stringify } = await import(`./${format}.js`)

export const safeLoad = content => {
    if (!content) return null
    const { kind, name, metadata, spec } = parse(content)
    return { kind, name, metadata, spec }
}
export const safeDump = ({ kind, name, metadata, spec }) => stringify({ kind, name, metadata, spec })

export const load = content => content ? parse(content) : null
export const dump = obj => stringify(obj)
