import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import type { AuthUser } from '../auth/auth.types'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { PaginationDto } from '../common/dto/pagination.dto'
import { ClientsService, type ClientView } from './clients.service'
import { CreateClientDto, UpdateClientDto } from './dto/client.dto'
import { AddPhotoDto } from './dto/photo.dto'

/**
 * Все роуты закрыты глобальным JwtAuthGuard. masterId — только из токена:
 * клиент физически не может попросить данные другого кабинета.
 */
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationDto): Promise<ClientView[]> {
    return this.clients.list(user.masterId, query.skip, query.take)
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ClientView> {
    return this.clients.findOne(user.masterId, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClientDto): Promise<ClientView> {
    return this.clients.create(user.masterId, dto)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientView> {
    return this.clients.update(user.masterId, id, dto)
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ deleted: true }> {
    return this.clients.remove(user.masterId, id)
  }

  @Post(':id/photos')
  addPhoto(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPhotoDto,
  ): Promise<{ id: string; label: string; createdAt: Date }> {
    return this.clients.addPhoto(user.masterId, id, dto)
  }

  /** Сама картинка. Тип взят из проверенной при загрузке сигнатуры. */
  @Get(':id/photos/:photoId')
  async photo(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { mime, data } = await this.clients.photo(user.masterId, id, photoId)
    res.set({
      'content-type': mime,
      // Браузер не угадывает тип сам — только тот, что мы проверили
      'x-content-type-options': 'nosniff',
      // Фото не меняется: id новый у каждого. private — не для общих кешей
      'cache-control': 'private, max-age=31536000, immutable',
    })
    res.send(Buffer.from(data))
  }

  @Delete(':id/photos/:photoId')
  removePhoto(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<{ deleted: true }> {
    return this.clients.removePhoto(user.masterId, id, photoId)
  }
}
