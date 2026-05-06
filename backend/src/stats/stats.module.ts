import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { AccountsReceivable } from '../accounts-receivable/entities/accounts-receivable.entity';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Customer, Product, Employee, Tenant, AccountsReceivable])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
