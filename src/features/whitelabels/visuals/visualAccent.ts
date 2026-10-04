/** Local visual input only. No Product field, slug derivation or persistence. */
export const DEFAULT_WHITELABEL_ACCENT = '#8b81ff'

/** The shader palette accepts a six-digit hex accent; invalid input uses violet. */
export function accentRgb(color: string): [number, number, number] {
  const hex = /^#[\da-f]{6}$/i.test(color) ? color : DEFAULT_WHITELABEL_ACCENT
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255) as [number, number, number]
}
