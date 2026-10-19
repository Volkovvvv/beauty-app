import { Controller, Delete, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import type { AuthUser } from '../auth/auth.types'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { InvitesService, type InviteView } from './invites.service'

@Controller('clients/:id/invite')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  /** Ссылка-приглашение в бота. Прошлые неиспользованные гасятся. */
  @Post()
  create(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) clientId: string): Promise<InviteView> {
    return this.invites.create(user.masterId, clientId)
  }

  @Delete()
  revoke(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) clientId: string): Promise<{ revoked: number }> {
    return this.invites.revoke(user.masterId, clientId)
  }
}
