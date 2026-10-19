import { Module } from '@nestjs/common'
import { ReminderPlanModule } from '../reminders/reminder-plan.module'
import { AppointmentsController } from './appointments.controller'
import { AppointmentsService } from './appointments.service'

@Module({
  imports: [ReminderPlanModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
