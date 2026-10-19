import { useState } from 'react'
import type { Specialty } from '../../../entities/master'
import { BottomBar, Button, Screen, Stack, TextField, Title } from '../../../shared/ui'
import SpecialtyPicker from './SpecialtyPicker'
import s from './Onboarding.module.css'

interface OnboardingPageProps {
  catalog: readonly Specialty[]
  telegramName: string
  onDone: (patch: { displayName: string; specialties: string[]; onboarded: true }) => Promise<void>
}

// Первый вход: как зовут и чем занимается. От направлений зависит стартовый прайс
export default function OnboardingPage({ catalog, telegramName, onDone }: OnboardingPageProps) {
  const [name, setName] = useState(telegramName.split(' ')[0] ?? '')
  const [picked, setPicked] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ready = name.trim() && picked.length > 0 && !saving

  const submit = () => {
    if (!ready) return
    setSaving(true)
    setError('')
    onDone({ displayName: name.trim(), specialties: picked, onboarded: true }).catch((e: Error) => {
      setError(e.message)
      setSaving(false)
    })
  }

  return (
    <>
      <Screen>
        <div className={s.hello}>
          <Title>
            Добро <i>пожаловать</i>
          </Title>
          <span className={s.lead}>Запись клиенток, напоминания в Telegram и деньги — в одном месте</span>
        </div>

        <TextField label="Как вас зовут клиентки" value={name} onChange={setName} placeholder="Вика" maxLength={100} />

        <Stack gap={10}>
          <span className={s.label}>Чем вы занимаетесь</span>
          <SpecialtyPicker catalog={catalog} value={picked} onChange={setPicked} />
          <span className={s.lead}>Можно несколько. Соберём стартовый прайс — цены и услуги потом поправите в профиле</span>
        </Stack>

        {error ? <span className={s.error}>{error}</span> : null}
      </Screen>

      <BottomBar>
        <Button size="lg" wide disabled={!ready} onClick={submit}>
          {saving ? 'Собираем прайс…' : 'Начать'}
        </Button>
      </BottomBar>
    </>
  )
}
