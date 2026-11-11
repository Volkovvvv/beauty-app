import { Body, Controller, Get, Patch, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { AuthUser } from '../auth/auth.types'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { OnboardingDto } from './dto/onboarding.dto'
import { UpdateMasterDto } from './dto/update-master.dto'
import { SPECIALTIES, type Specialty } from '../specialties/specialties'
import { MastersService, type MasterView } from './masters.service'

/** Профиль своего кабинета. Кабинет берётся из токена — чужой не запросить. */
@Controller('master')
export class MastersController {
  constructor(private readonly masters: MastersService) {}

  @Get()
  get(@CurrentUser() user: AuthUser): Promise<MasterView> {
    return this.masters.get(user.masterId)
  }

  /** Каталог специализаций: выбор при знакомстве, подсказки услуг и подписи карточки */
  @Get('specialties')
  specialties(): readonly Specialty[] {
    return SPECIALTIES
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMasterDto): Promise<MasterView> {
    return this.masters.update(user.masterId, dto)
  }

  /** Знакомство при первом входе: о себе, сферы и свои услуги */
  @Post('onboarding')
  onboard(@CurrentUser() user: AuthUser, @Body() dto: OnboardingDto): Promise<MasterView> {
    return this.masters.onboard(user.masterId, dto)
  }

  /** Выгрузка клиенток и записей в два CSV-файла — бот присылает их мастеру в чат */
  @Post('export')
  // Файлы тяжёлые, а письмо в чат — не повод слать его десять раз подряд
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  export(@CurrentUser() user: AuthUser): Promise<{ sent: true; clients: number; appointments: number }> {
    return this.masters.exportToChat(user.masterId)
  }
}
