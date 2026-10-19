import { declinedText, rebookText, visitReminderText, whenLabel } from './messages'

const TZ = 'Europe/Moscow'
const msk = (s: string) => new Date(`${s}+03:00`)

describe('тексты бота', () => {
  it('завтра, сегодня и дата', () => {
    const now = msk('2026-10-21T12:00:00')
    expect(whenLabel(msk('2026-10-22T12:00:00'), TZ, now)).toBe('завтра в 12:00 мск')
    expect(whenLabel(msk('2026-10-21T18:30:00'), TZ, now)).toBe('сегодня в 18:30 мск')
    expect(whenLabel(msk('2026-10-24T10:00:00'), TZ, now)).toBe('24 октября в 10:00 мск')
  })

  it('напоминание о визите — с услугами и именем мастера', () => {
    const text = visitReminderText({
      clientName: 'Алина',
      masterName: 'Вика',
      services: 'Коррекция + дизайн',
      startsAt: msk('2026-10-22T12:00:00'),
      timezone: TZ,
      now: msk('2026-10-21T12:00:00'),
    })
    expect(text).toBe('Алина, напоминаю о записи завтра в 12:00 мск: коррекция + дизайн.\nМастер — Вика. Получится прийти?')
  })

  it('зовёт на коррекцию с правильной формой слова «неделя»', () => {
    expect(rebookText({ clientName: 'Алина', weeks: 3, masterUsername: 'vika_nails', correction: true })).toBe(
      'Алина, с прошлого визита прошло 3 недели — пора на коррекцию.\nНапишите мастеру: @vika_nails',
    )
    expect(rebookText({ clientName: 'Оля', weeks: 5, masterUsername: null, correction: true })).toContain('прошло 5 недель')
    expect(rebookText({ clientName: 'Оля', weeks: 1, masterUsername: null, correction: true })).toContain('прошла 1 неделя')
  })

  it('стрижке и массажу — без слова «коррекция»', () => {
    expect(rebookText({ clientName: 'Оля', weeks: 6, masterUsername: null, correction: false })).toContain(
      'самое время записаться снова',
    )
  })

  it('мастеру — об отказе', () => {
    expect(declinedText('Алина Морозова', msk('2026-10-22T12:00:00'), TZ, msk('2026-10-21T20:00:00'))).toBe(
      'Алина Морозова не сможет прийти завтра в 12:00 мск.\nЗапись осталась в расписании — перенесите или отмените её в приложении.',
    )
  })
})
