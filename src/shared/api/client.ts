// Тонкий HTTP-клиент к бэкенду. Держит JWT в памяти и в localStorage,
// подставляет Authorization, разбирает ошибки в единый формат.
import { getInitData } from './telegram'

export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const TOKEN_KEY = 'beauty-crm:token'

let token: string | null = null
try {
  token = localStorage.getItem(TOKEN_KEY)
} catch {
  // приватный режим — работаем без сохранения токена между сессиями
}

function setToken(next: string | null): void {
  token = next
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // квота или приватный режим — токен всё равно живёт в памяти на сессию
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

const TIMEOUT_MS = 20_000
const NETWORK_MESSAGE = 'Нет связи с сервером. Проверьте интернет; если включён VPN — попробуйте выключить или сменить его'
const TIMEOUT_MESSAGE = 'Сервер долго не отвечает. Проверьте интернет (или VPN) и повторите'

// fetch без тайм-аута при блокировке сети висит минутами без ошибки —
// человек видит бесконечную загрузку. Здесь зависание становится ошибкой.
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new ApiError(0, TIMEOUT_MESSAGE)
    // «Failed to fetch» / «Load failed» ничего не говорят человеку
    throw new ApiError(0, NETWORK_MESSAGE)
  } finally {
    clearTimeout(timer)
  }
}

async function send(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(options.headers as Record<string, string>) }
  if (token) headers.authorization = `Bearer ${token}`

  const res = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers })
  // Токен истёк — сбрасываем, чтобы следующий запуск прошёл вход заново
  if (res.status === 401) setToken(null)

  if (!res.ok) {
    let message: string | string[] = `Ошибка ${res.status}`
    try {
      const body = (await res.json()) as { message?: string | string[] }
      message = body.message ?? message
    } catch {
      // тело не JSON — оставляем обобщённое сообщение
    }
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message)
  }
  return res
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await send(path, options)
  return (res.status === 204 ? null : await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** Картинка за авторизацией: <img src> не умеет слать заголовок с токеном */
  blob: async (path: string): Promise<Blob> => (await send(path)).blob(),
}

// Сервер отдаёт списки страницами (не больше 200): собираем все,
// иначе у мастера с длинной историей новые записи не дошли бы до приложения.
const PAGE = 200
export async function getAll<T>(path: string): Promise<T[]> {
  const all: T[] = []
  for (;;) {
    const page = await request<T[]>(`${path}${path.includes('?') ? '&' : '?'}take=${PAGE}&skip=${all.length}`)
    all.push(...page)
    if (page.length < PAGE) return all
  }
}

export interface LoginResult {
  accessToken: string
  masterId: string
}

// Вход по initData: Telegram отдаёт её подписанной строкой,
// бэкенд проверяет подпись токеном бота.
export async function login(): Promise<LoginResult> {
  let initData = getInitData()
  // Локальная разработка в обычном браузере: подписанный initData тестового
  // мастера выдаёт dev-сервер (tools/vite-dev-telegram-login.ts).
  // В сборке import.meta.env.DEV = false, ветка вырезается целиком.
  if (!initData && import.meta.env.DEV) initData = await devInitData()
  if (!initData) throw new ApiError(0, 'Приложение открыто не из Telegram — вход невозможен')

  const res = await fetchWithTimeout(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // Таймзона устройства: в ней сервер пишет время в напоминаниях
    body: JSON.stringify({ initData, timezone: deviceTimezone() }),
  })
  // Сервер не раскрывает, что не сошлось в подписи, но код ответа показать стоит
  if (!res.ok) throw new ApiError(res.status, `Сервер отклонил вход (код ${res.status})`)
  const data = (await res.json()) as LoginResult
  setToken(data.accessToken)
  return data
}

function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}

async function devInitData(): Promise<string> {
  const res = await fetch('/__dev/init-data')
  if (!res.ok) throw new ApiError(res.status, `Dev-вход не сработал: ${await res.text()}`)
  return res.text()
}
