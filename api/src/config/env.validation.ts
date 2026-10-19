import { plainToInstance } from 'class-transformer'
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, validateSync } from 'class-validator'

export enum BotMode {
  polling = 'polling',
  webhook = 'webhook',
  /** Бот не подключается к Telegram — для локальной разработки интерфейса,
   *  чтобы не отбирать обновления у продового бота с тем же токеном. */
  off = 'off',
}

export enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

/**
 * Схема переменных окружения. Проверяется на старте: приложение без BOT_TOKEN
 * должно падать сразу с понятным текстом, а не через час на первом запросе.
 */
class EnvVars {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string

  // Тем же токеном проверяется подпись initData, поэтому он обязателен даже без бота.
  @IsString()
  @IsNotEmpty()
  BOT_TOKEN!: string

  @IsString()
  @IsOptional()
  BOT_USERNAME?: string

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string

  @IsNumber()
  @IsOptional()
  PORT?: number

  @IsNumber()
  @IsOptional()
  TRUST_PROXY?: number

  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV?: NodeEnv

  @IsEnum(BotMode, { message: 'BOT_MODE: polling | webhook | off' })
  @IsOptional()
  BOT_MODE?: BotMode

  @IsString()
  @IsOptional()
  BOT_PUBLIC_URL?: string

  @IsString()
  @IsOptional()
  BOT_WEBHOOK_SECRET?: string

  // Адрес мини-аппа (https): кнопка «Открыть кабинет» в приветствии бота.
  @IsString()
  @IsOptional()
  MINI_APP_URL?: string
}

export function validateEnv(raw: Record<string, unknown>): EnvVars {
  const parsed = plainToInstance(EnvVars, raw, { enableImplicitConversion: true })
  const errors = validateSync(parsed, { skipMissingProperties: false })

  if (errors.length > 0) {
    const details = errors
      .map((e) => `  ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n')
    throw new Error(`Некорректные переменные окружения:\n${details}\n\nСм. .env.example`)
  }

  // Без имени бота ссылки-приглашения ведут в никуда: t.me/?start=…
  if (parsed.BOT_MODE !== BotMode.off && !parsed.BOT_USERNAME?.replace(/^@/, '').trim()) {
    throw new Error('Нужен BOT_USERNAME — имя бота без @: из него собираются ссылки-приглашения')
  }

  // Webhook без секрета — открытый эндпоинт для поддельных «обновлений».
  if (parsed.BOT_MODE === BotMode.webhook) {
    if (!parsed.BOT_PUBLIC_URL) throw new Error('BOT_MODE=webhook требует BOT_PUBLIC_URL')
    if (!parsed.BOT_WEBHOOK_SECRET || parsed.BOT_WEBHOOK_SECRET.length < 16) {
      throw new Error('BOT_MODE=webhook требует BOT_WEBHOOK_SECRET длиной не меньше 16 символов (openssl rand -hex 32)')
    }
  }

  return parsed
}
