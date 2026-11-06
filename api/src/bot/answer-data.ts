export type Answer = 'ok' | 'no'

/**
 * callback_data кнопок «Приду» / «Не смогу»: ответ, id записи и время визита.
 * Время — чтобы кнопка под напоминанием о прежнем времени не подтвердила
 * перенесённый визит. Секунды в base36: укладываемся в 64 байта Telegram.
 */
export function answerData(answer: Answer, appointmentId: string, startsAt: Date): string {
  return `${answer}:${appointmentId}:${Math.floor(startsAt.getTime() / 1000).toString(36)}`
}

// Без времени — кнопки из напоминаний, отправленных до появления этой проверки
const ANSWER_RE = /^(ok|no):([0-9a-f-]{36})(?::([0-9a-z]{1,10}))?$/

export interface ParsedAnswer {
  answer: Answer
  appointmentId: string
  /** Время визита, о котором было напоминание; null — старая кнопка без него */
  startsAt: Date | null
}

export function parseAnswerData(data: string): ParsedAnswer | null {
  const match = ANSWER_RE.exec(data)
  if (!match) return null
  const seconds = match[3] ? parseInt(match[3], 36) : null
  return {
    answer: match[1] as Answer,
    appointmentId: match[2],
    startsAt: seconds === null ? null : new Date(seconds * 1000),
  }
}
