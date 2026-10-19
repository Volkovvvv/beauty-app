import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import type { AuthUser } from '../auth/auth.types'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AppointmentsService, type AppointmentView } from './appointments.service'
import { CreateAppointmentDto, ListAppointmentsDto, UpdateAppointmentDto } from './dto/appointment.dto'

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListAppointmentsDto): Promise<AppointmentView[]> {
    return this.appointments.list(user.masterId, query)
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<AppointmentView> {
    return this.appointments.findOne(user.masterId, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto): Promise<AppointmentView> {
    return this.appointments.create(user.masterId, dto)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ): Promise<AppointmentView> {
    return this.appointments.update(user.masterId, id, dto)
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ deleted: true }> {
    return this.appointments.remove(user.masterId, id)
  }
}
