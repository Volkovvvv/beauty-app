import { Body, Controller, Get, Patch } from '@nestjs/common'
import type { AuthUser } from '../auth/auth.types'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
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

  /** Каталог специализаций: выбор при первом входе, подписи карточки и стартовые прайсы */
  @Get('specialties')
  specialties(): readonly Specialty[] {
    return SPECIALTIES
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMasterDto): Promise<MasterView> {
    return this.masters.update(user.masterId, dto)
  }
}
