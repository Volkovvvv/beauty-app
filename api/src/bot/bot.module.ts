import { Module } from '@nestjs/common'
import { InvitesModule } from '../invites/invites.module'
import { AnswersService } from './answers.service'
import { BotController } from './bot.controller'
import { BotService } from './bot.service'

@Module({
  imports: [InvitesModule],
  controllers: [BotController],
  providers: [BotService, AnswersService],
  // Рассылка напоминаний отправляет через BotService
  exports: [BotService],
})
export class BotModule {}
