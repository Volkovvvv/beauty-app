import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_WORKDAY } from '../../appointment'
import type { Master, Wording } from '../model/master'

interface MasterContextValue {
  master: Master
  wording: Wording
}

const FALLBACK: MasterContextValue = {
  master: { name: 'мастер', telegramName: '', username: null, workday: DEFAULT_WORKDAY, specialties: [], onboarded: true },
  wording: { cardLabel: 'Особенности', correction: false },
}

const MasterContext = createContext<MasterContextValue>(FALLBACK)

// Профиль мастера меняется редко, а нужен многим экранам: имя, рабочий день,
// слова под направление. Контекст вместо протаскивания через все пропсы.
export function MasterProvider({ value, children }: { value: MasterContextValue; children: ReactNode }) {
  return <MasterContext.Provider value={value}>{children}</MasterContext.Provider>
}

export const useMaster = (): MasterContextValue => useContext(MasterContext)
