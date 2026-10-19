// Склеивает имена классов, пропуская пустые: cx(s.btn, active && s.on)
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}
