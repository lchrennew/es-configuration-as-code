export const format = process.env.PRESENTATION_FORMAT ?? 'yaml'

const { parse, stringify } = await import(`./${format}.js`)

export const load = content => {
    if (!content) return null
    const { kind, name, metadata, spec } = parse(content)
    return { kind, name, metadata, spec }
}
export const dump = obj => stringify(obj)
