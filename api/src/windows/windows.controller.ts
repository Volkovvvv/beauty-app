import { Body, Controller, Get, Put, Query } from '@nestjs/common'
import type { AuthUser } from '../auth/auth.types'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ListWindowEditsDto, SaveWindowEditsDto } from './dto/window-edit.dto'
import { WindowsService, type WindowEditView } from './windows.service'

/**
 * Ручные правки свободных окон для сторис на месяц. Сами окна считает
 * мини-апп из рабочих часов и записей — сервер хранит только отличия.
 */
@Controller('windows')
export class WindowsController {
  constructor(private readonly windows: WindowsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListWindowEditsDto): Promise<WindowEditView[]> {
    return this.windows.list(user.masterId, query)
  }

  @Put()
  save(@CurrentUser() user: AuthUser, @Body() dto: SaveWindowEditsDto): Promise<WindowEditView[]> {
    return this.windows.save(user.masterId, dto)
  }
}
