import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payroll } from './entities/payroll.entity';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { Employee } from '../employees/entities/employee.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Expense } from '../expenses/entities/expense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payroll, Employee, Tenant, Expense])],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
