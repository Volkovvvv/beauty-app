import { Module } from '@nestjs/common'
import { BotModule } from '../bot/bot.module'
import { ReminderPlanModule } from '../reminders/reminder-plan.module'
import { AppointmentsController } from './appointments.controller'
import { AppointmentsService } from './appointments.service'

@Module({
  imports: [ReminderPlanModule, BotModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
