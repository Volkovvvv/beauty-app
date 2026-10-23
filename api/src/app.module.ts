import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { AppointmentsModule } from './appointments/appointments.module'
import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { BotModule } from './bot/bot.module'
import { ClientsModule } from './clients/clients.module'
import { UserThrottlerGuard } from './common/user-throttler.guard'
import { validateEnv } from './config/env.validation'
import { HealthModule } from './health/health.module'
import { InvitesModule } from './invites/invites.module'
import { MastersModule } from './masters/masters.module'
import { PrismaModule } from './prisma/prisma.module'
import { RemindersModule } from './reminders/reminders.module'
import { ServicesModule } from './services/services.module'
import { StoriesModule } from './stories/stories.module'
import { WindowsModule } from './windows/windows.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // /auth/login — единственная открытая точка, подбор подписи должен стоить дорого.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    // Нужен для @Cron в планировщике напоминаний.
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    MastersModule,
    ServicesModule,
    ClientsModule,
    AppointmentsModule,
    InvitesModule,
    BotModule,
    RemindersModule,
    HealthModule,
    StoriesModule,
    WindowsModule,
  ],
  providers: [
    // Глобально: любой новый роут закрыт, пока не помечен @Public.
    // Первым: лимит запросов считается на мастера, которого определяет этот guard.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
})
export class AppModule {}
