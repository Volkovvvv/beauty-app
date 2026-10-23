import type { BookingInitial } from '../../features/add-appointment'
import type { ISODate } from '../../shared/lib/date'
import type { TabItem } from '../../shared/ui'

// prev — экран, с которого пришли: «назад» возвращает ровно туда

export type TabName = 'today' | 'records' | 'clients' | 'money'

export type View = (
  | { name: TabName }
  | { name: 'client'; id: string }
  | { name: 'book'; initial: BookingInitial }
  | { name: 'profile' }
  | { name: 'services' }
  // Онлайн-запись глазами клиентки — предпросмотр для мастера
  | { name: 'bookingPreview' }
  // Окошки на месяц и серия сторис из них; month — первое число месяца
  | { name: 'monthWindows'; month: ISODate }
  | { name: 'monthStories'; month: ISODate }
  // then — вернуться в запись с новой клиенткой, если её добавляли из шторки выбора
  | { name: 'addClient'; then?: BookingInitial }
) & { prev?: View }

export const TABS: readonly TabItem<TabName>[] = [
  { value: 'today', label: 'Сегодня' },
  { value: 'records', label: 'Записи' },
  { value: 'clients', label: 'Клиенты' },
  { value: 'money', label: 'Деньги' },
]

const TAB_NAMES = new Set<string>(TABS.map((t) => t.value))

export const isTab = (view: View): view is { name: TabName } => TAB_NAMES.has(view.name)

export const openView = (current: View, next: View): View => ({ ...next, prev: current })

export const backTarget = (view: View): View => view.prev ?? { name: 'today' }
