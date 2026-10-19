export type { Client, ClientCard, ClientStats, InviteStatus, WorkPhoto } from './model/client'
export {
  firstName,
  initials,
  shortName,
  indexById,
  groupByClient,
  appointmentsOf,
  clientStats,
  clientHint,
  visitsLabel,
} from './model/client'
export { default as ClientRow } from './ui/ClientRow'
export { default as WorkPhotoTile } from './ui/WorkPhotoTile'
