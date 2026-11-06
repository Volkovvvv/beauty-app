import { answerData, parseAnswerData } from './answer-data'

const ID = '3f2b8c1e-9a4d-4e7f-8b6a-1c2d3e4f5a6b'

describe('кнопки ответа на напоминание', () => {
  it('туда и обратно, в пределах 64 байт', () => {
    const at = new Date('2026-10-22T09:00:00Z')
    const data = answerData('ok', ID, at)
    expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64)
    expect(parseAnswerData(data)).toEqual({ answer: 'ok', appointmentId: ID, startsAt: at })
  })

  it('старая кнопка без времени', () => {
    expect(parseAnswerData(`no:${ID}`)).toEqual({ answer: 'no', appointmentId: ID, startsAt: null })
  })

  it('чужие данные', () => {
    expect(parseAnswerData('hello')).toBeNull()
    expect(parseAnswerData(`maybe:${ID}`)).toBeNull()
  })
})
