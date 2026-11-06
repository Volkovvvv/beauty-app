// Часовые пояса для выбора в профиле: города, где обычно работают мастера.
// Пояс не из списка (мастер за границей) добавляется к нему сам.

const ZONES: ReadonlyArray<[string, string]> = [
  ['Europe/Kaliningrad', 'Калининград'],
  ['Europe/Moscow', 'Москва'],
  ['Europe/Samara', 'Самара'],
  ['Asia/Yekaterinburg', 'Екатеринбург'],
  ['Asia/Omsk', 'Омск'],
  ['Asia/Novosibirsk', 'Новосибирск'],
  ['Asia/Krasnoyarsk', 'Красноярск'],
  ['Asia/Irkutsk', 'Иркутск'],
  ['Asia/Yakutsk', 'Якутск'],
  ['Asia/Vladivostok', 'Владивосток'],
  ['Asia/Magadan', 'Магадан'],
  ['Asia/Kamchatka', 'Камчатка'],
  ['Europe/Minsk', 'Минск'],
  ['Europe/Kyiv', 'Киев'],
  ['Asia/Almaty', 'Алматы'],
  ['Asia/Tashkent', 'Ташкент'],
  ['Asia/Tbilisi', 'Тбилиси'],
  ['Asia/Yerevan', 'Ереван'],
  ['Asia/Baku', 'Баку'],
]

/** «UTC+3» сейчас в поясе */
function offsetLabel(tz: string): string {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value
    return (name ?? 'GMT').replace('GMT', 'UTC').replace(/^UTC$/, 'UTC+0')
  } catch {
    return ''
  }
}

/** «Москва · UTC+3»; незнакомый пояс — по последней части: «Europe/Lisbon» → «Lisbon» */
export function zoneLabel(tz: string): string {
  const city = ZONES.find(([id]) => id === tz)?.[1] ?? tz.split('/').pop()?.replace(/_/g, ' ') ?? tz
  const offset = offsetLabel(tz)
  return offset ? `${city} · ${offset}` : city
}

/** Пояса для выбора: список плюс те, что нужны мастеру сейчас */
export function zoneOptions(...extra: Array<string | undefined>): { value: string; label: string }[] {
  const ids = ZONES.map(([id]) => id)
  for (const tz of extra) if (tz && !ids.includes(tz)) ids.push(tz)
  return ids.map((value) => ({ value, label: zoneLabel(value) }))
}
