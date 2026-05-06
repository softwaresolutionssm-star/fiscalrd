import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { BusinessHour } from './entities/business-hour.entity';
import { BusinessException } from './entities/business-exception.entity';
import { ScheduleTemplate } from './entities/schedule-template.entity';
import { EmployeeSchedule } from './entities/employee-schedule.entity';
import { EmployeeScheduleException } from './entities/employee-schedule-exception.entity';
import { VacationRequest } from './entities/vacation-request.entity';
import { Employee } from '../employees/entities/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BusinessHour,
      BusinessException,
      ScheduleTemplate,
      EmployeeSchedule,
      EmployeeScheduleException,
      VacationRequest,
      Employee,
    ]),
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
