import type { AppointmentDraft } from '../../../entities/appointment'
import type { ISODate } from '../../../shared/lib/date'

/** С чем открыть экран записи. replaceId — перенос этой записи */
export interface BookingInitial {
  clientId?: string
  serviceIds?: string[]
  date?: ISODate
  /** Минуты от полуночи — время окна, с которого открыли запись */
  start?: number
  /** Своя длительность записи, если мастер её поправил */
  minutes?: number
  replaceId?: string
  note?: string
}

/** Итог формы: черновик записи. remind и rebook — переключатели внизу формы */
export type BookingResult = AppointmentDraft
