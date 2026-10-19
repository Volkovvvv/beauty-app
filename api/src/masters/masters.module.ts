import { Module } from '@nestjs/common'
import { ReminderPlanModule } from '../reminders/reminder-plan.module'
import { MastersController } from './masters.controller'
import { MastersService } from './masters.service'

@Module({
  imports: [ReminderPlanModule],
  controllers: [MastersController],
  providers: [MastersService],
})
export class MastersModule {}
