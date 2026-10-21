import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'
import type { AuthUser } from '../auth/auth.types'
import { matchesMime } from '../clients/photo-signature'
import { CreateStoryDto } from './stories.dto'
import { StoryStore, STORY_TTL_MS } from './story-store'

/**
 * Картинка для сторис. Telegram публикует сторис только по публичной
 * https-ссылке (WebApp.shareToStory), поэтому мини-апп сначала кладёт
 * готовую картинку сюда, а Telegram забирает её по ссылке без входа.
 */
@Controller('stories')
export class StoriesController {
  private readonly store = new StoryStore()

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStoryDto): { id: string; expiresIn: number } {
    const data = Buffer.from(dto.data, 'base64')
    // Только JPEG по содержимому: ссылка открыта всем, отдавать с нашего домена что попало нельзя
    if (!matchesMime(data, 'image/jpeg')) throw new BadRequestException('Картинка сторис — JPEG')
    return { id: this.store.put(user.masterId, data), expiresIn: STORY_TTL_MS / 1000 }
  }

  /** Открыта без входа: её забирает сервер Telegram. */
  @Public()
  @Get(':file')
  get(@Param('file') file: string, @Res() res: Response): void {
    const id = /^([0-9a-f]{32})\.jpg$/.exec(file)?.[1]
    const data = id ? this.store.get(id) : null
    if (!data) throw new NotFoundException('Картинка устарела — соберите сторис заново')
    res.set({
      'content-type': 'image/jpeg',
      'x-content-type-options': 'nosniff',
      'cache-control': 'public, max-age=900, immutable',
    })
    res.send(data)
  }
}
