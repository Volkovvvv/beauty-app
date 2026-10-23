import { Body, Controller, Get, Patch, Post } from '@nestjs/common'
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
}
