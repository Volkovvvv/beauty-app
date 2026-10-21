import { randomBytes } from 'node:crypto'

/** Сколько картинка доступна по ссылке: Telegram забирает её сразу после shareToStory. */
export const STORY_TTL_MS = 15 * 60_000
/** Сколько свежих картинок держим на мастера — старые вытесняются. */
const PER_MASTER = 3
/** Потолок на весь процесс, чтобы память не росла без предела. */
const TOTAL = 300

interface Entry {
  masterId: string
  data: Buffer
  expiresAt: number
}

/**
 * Картинки сторис в памяти процесса. Не база: картинка одноразовая,
 * нужна Telegram на минуту, а хранить её дольше незачем.
 * Id — 128 случайных бит: ссылку не угадать, хотя она и открыта без входа.
 */
export class StoryStore {
  private readonly items = new Map<string, Entry>()

  constructor(private readonly now: () => number = Date.now) {}

  put(masterId: string, data: Buffer): string {
    this.sweep()
    const mine = [...this.items].filter(([, e]) => e.masterId === masterId)
    // Map хранит порядок вставки: первые — самые старые
    for (const [id] of mine.slice(0, Math.max(0, mine.length - PER_MASTER + 1))) this.items.delete(id)
    while (this.items.size >= TOTAL) this.items.delete(this.items.keys().next().value as string)

    const id = randomBytes(16).toString('hex')
    this.items.set(id, { masterId, data, expiresAt: this.now() + STORY_TTL_MS })
    return id
  }

  get(id: string): Buffer | null {
    const entry = this.items.get(id)
    if (!entry) return null
    if (entry.expiresAt <= this.now()) {
      this.items.delete(id)
      return null
    }
    return entry.data
  }

  private sweep(): void {
    const t = this.now()
    for (const [id, e] of this.items) if (e.expiresAt <= t) this.items.delete(id)
  }
}
