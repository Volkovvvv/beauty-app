import { Module } from '@nestjs/common'
import { BotModule } from '../bot/bot.module'
import { ReminderPlanModule } from '../reminders/reminder-plan.module'
import { MastersController } from './masters.controller'
import { MastersService } from './masters.service'

@Module({
  imports: [ReminderPlanModule, BotModule],
  controllers: [MastersController],
  providers: [MastersService],
})
export class MastersModule {}
