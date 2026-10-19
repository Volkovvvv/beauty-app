import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Bot, GrammyError, HttpError, InlineKeyboard } from 'grammy'
import { InvitesService } from '../invites/invites.service'
import { AnswersService, type Answer } from './answers.service'

/** Итог попытки отправки — для журнала напоминаний. */
export interface SendResult {
  ok: boolean
  /** Заблокировала бота: повторять бессмысленно. */
  blocked?: boolean
  error?: string
}

/** Кнопка под сообщением: data вернётся в callback_query. */
export interface InlineButton {
  text: string
  data: string
}

// ok:<uuid> / no:<uuid> — ответ на напоминание о визите
const ANSWER_RE = /^(ok|no):([0-9a-f-]{36})$/

const NOT_A_CHAT = 'Я присылаю напоминания о записи и не умею отвечать на сообщения.'

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name)
  private readonly bot: Bot
  private readonly mode: string
  /** Адрес мини-аппа для кнопки «Открыть кабинет»; null — кнопки нет. */
  private readonly appUrl: string | null

  constructor(
    private readonly invites: InvitesService,
    private readonly answers: AnswersService,
    private readonly config: ConfigService,
  ) {
    this.bot = new Bot(config.getOrThrow<string>('BOT_TOKEN'))
    this.mode = config.get<string>('BOT_MODE') ?? 'polling'
    const appUrl = config.get<string>('MINI_APP_URL')?.trim() ?? ''
    // Telegram принимает в кнопке только https
    this.appUrl = appUrl.startsWith('https://') ? appUrl : null
    this.registerHandlers()
  }

  private openHint(): string {
    return this.appUrl ? 'Откройте кабинет кнопкой ниже.' : 'Откройте кабинет кнопкой меню рядом с полем ввода.'
  }

  private openKeyboard(): { reply_markup: InlineKeyboard } | undefined {
    return this.appUrl ? { reply_markup: new InlineKeyboard().webApp('Открыть кабинет', this.appUrl) } : undefined
  }

  /** Экземпляр для webhook-колбэка; рассылка пользуется sendMessage. */
  get instance(): Bot {
    return this.bot
  }

  private registerHandlers(): void {
    this.bot.command('start', async (ctx) => {
      const payload = ctx.match?.trim()
      const from = ctx.from
      if (!from) return

      if (!payload) {
        // Без кода приходят и мастера, и клиентки без ссылки — говорим обоим, что делать
        await ctx.reply(
          'Привет! Это помощник бьюти-мастера.\n\n' +
            `Вы мастер? ${this.openHint()} В нём запись клиенток, свободные окна и деньги.\n\n` +
            'Вы клиентка? Откройте ссылку-приглашение от мастера — напоминания о записи будут приходить сюда.',
          this.openKeyboard(),
        )
        return
      }

      const result = await this.invites.accept(payload, {
        id: from.id,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
      })
      // Один ответ на все причины отказа: иначе по тексту можно подбирать ссылки
      if (!result) {
        await ctx.reply('Ссылка недействительна или уже использована.\nПопросите мастера отправить новую.')
        return
      }
      await ctx.reply(`Готово, ${result.clientName}! Напоминания о записи будут приходить сюда.`)
      this.logger.log(`Клиентка подключена: ${result.clientId}`)
    })

    // Кнопки «Приду» / «Не смогу» под напоминанием
    this.bot.on('callback_query:data', async (ctx) => {
      const match = ANSWER_RE.exec(ctx.callbackQuery.data)
      if (!match) {
        await ctx.answerCallbackQuery()
        return
      }
      const result = await this.answers.answer(BigInt(ctx.from.id), match[1] as Answer, match[2])
      await ctx.answerCallbackQuery({ text: result.toast })
      // Кнопки убираем, чтобы не жать дважды; сам текст напоминания остаётся
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined)
      if (result.notifyMaster) await this.sendMessage(result.notifyMaster.tgId, result.notifyMaster.text)
    })

    // Любое другое сообщение: бот не диалоговый, объясняем это прямо
    this.bot.on('message', async (ctx) => {
      await ctx.reply(`${NOT_A_CHAT} Мастер? ${this.openHint()}`, this.openKeyboard())
    })

    // Бот принимает ввод от произвольных людей: падение здесь остановило бы весь API
    this.bot.catch((err) => {
      const e = err.error
      if (e instanceof GrammyError) this.logger.error(`Telegram отклонил запрос: ${e.description}`)
      else if (e instanceof HttpError) this.logger.error(`Сеть недоступна: ${e.message}`)
      else this.logger.error(`Ошибка бота: ${String(e)}`)
    })
  }

  /**
   * Отправка сообщения. Не бросает исключений: рассылка обрабатывает сотни
   * отправок, и падение на одной заблокировавшей бота остановило бы остальные.
   */
  async sendMessage(tgId: bigint, text: string, buttons?: InlineButton[]): Promise<SendResult> {
    // Локально бот выключен: не пишем реальным людям из тестовой базы
    if (this.mode === 'off') {
      this.logger.debug(`BOT_MODE=off, сообщение для ${tgId} не отправлено: ${text}`)
      return { ok: false, error: 'BOT_MODE=off' }
    }
    try {
      const reply_markup = buttons
        ? buttons.reduce((kb, b) => kb.text(b.text, b.data), new InlineKeyboard())
        : undefined
      await this.bot.api.sendMessage(Number(tgId), text, reply_markup ? { reply_markup } : undefined)
      return { ok: true }
    } catch (e) {
      if (e instanceof GrammyError) {
        // 403 — заблокировала бота или удалила чат
        return { ok: false, blocked: e.error_code === 403, error: e.description }
      }
      return { ok: false, error: (e as Error).message }
    }
  }

  /**
   * Подключение к Telegram при старте. Ошибки логируются, но не бросаются:
   * недоступный Telegram не должен мешать API подняться.
   */
  async onModuleInit(): Promise<void> {
    try {
      if (this.mode === 'off') {
        this.logger.log('BOT_MODE=off — бот не подключён, напоминания не отправляются')
      } else if (this.mode === 'webhook') {
        const base = this.config.getOrThrow<string>('BOT_PUBLIC_URL').replace(/\/$/, '')
        const url = `${base}/api/bot/webhook`
        await this.bot.api.setWebhook(url, { secret_token: this.config.getOrThrow<string>('BOT_WEBHOOK_SECRET') })
        this.logger.log(`Webhook установлен: ${url}`)
      } else {
        // Снимаем webhook, иначе getUpdates пуст. Накопившиеся обновления не выбрасываем:
        // среди них /start клиентки по приглашению
        await this.bot.api.deleteWebhook()
        void this.bot.start({ onStart: () => this.logger.log('Бот запущен в режиме polling') })
      }
    } catch (e) {
      this.logger.error(`Бот не запущен (${(e as Error).message}). API работает, напоминания не отправляются.`)
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.mode === 'polling') await this.bot.stop()
  }
}
