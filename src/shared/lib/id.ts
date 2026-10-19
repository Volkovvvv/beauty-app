let seq = 0

// Локальный id для записей, созданных в приложении до появления бэкенда
export function newId(prefix = 'id'): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}
