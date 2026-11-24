/** Escapes LIKE/ILIKE wildcards so user text matches literally (the default escape is a backslash). */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)
