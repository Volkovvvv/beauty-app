/** Полезная нагрузка JWT. Только идентификаторы — ничего лишнего. */
export interface JwtPayload {
  /** User.id */
  sub: string
  /** Master.id — кладём в токен, чтобы не искать кабинет на каждом запросе. */
  mid: string
}

/** Пользователь, добавленный guard'ом в request. */
export interface AuthUser {
  userId: string
  masterId: string
}
