// Prisma 7 берёт строку подключения отсюда (для CLI: migrate, studio).
// Рантайм-клиент получает её через адаптер — см. src/prisma/prisma.service.ts.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Не env(): тот падает без переменной, а `prisma generate` в postinstall
    // при сборке на хостинге её может не получить — базе он не нужен.
    // migrate deploy при старте без строки подключения всё равно упадёт.
    url: process.env.DATABASE_URL ?? '',
  },
})
