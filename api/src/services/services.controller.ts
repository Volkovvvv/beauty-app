import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import type { AuthUser } from '../auth/auth.types'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto'
import { ServicesService, type ServiceView } from './services.service'

/** Прайс своего кабинета. masterId — только из токена. */
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ServiceView[]> {
    return this.services.list(user.masterId)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceDto): Promise<ServiceView> {
    return this.services.create(user.masterId, dto)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceView> {
    return this.services.update(user.masterId, id, dto)
  }

  @Delete(':id')
  archive(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ archived: true }> {
    return this.services.archive(user.masterId, id)
  }
}
