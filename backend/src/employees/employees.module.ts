import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeBranchHistory } from './entities/employee-branch-history.entity';
import { CashRegisterSession } from '../cash-register/entities/cash-register-session.entity';
import { User } from '../users/entities/user.entity';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, EmployeeBranchHistory, CashRegisterSession, User])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
