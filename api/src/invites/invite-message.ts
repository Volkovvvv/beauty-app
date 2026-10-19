/** Текст приглашения клиентке. Отдельно от сервиса — чтобы проверять без базы. */
export function inviteMessage(opts: { clientName: string; masterName: string | null; link: string }): string {
  const first = opts.clientName.split(' ')[0]
  const who = opts.masterName ? `Это ${opts.masterName}, ваш мастер.` : 'Это ваш мастер.'
  return (
    `${first}, привет! ${who} Напоминания о записи будут приходить через этого бота — ` +
    `ответить «приду» или «не смогу» можно прямо в нём.\n\n` +
    `Нажмите ссылку и кнопку «Начать»:\n${opts.link}`
  )
}
