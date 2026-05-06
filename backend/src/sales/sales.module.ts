import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesPublicController } from './sales-public.controller';
import { NcfSequencesModule } from '../ncf-sequences/ncf-sequences.module';
import { AccountsReceivable } from '../accounts-receivable/entities/accounts-receivable.entity';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PlatformSetting } from '../admin/entities/platform-setting.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { AlanubeModule } from '../alanube/alanube.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, AccountsReceivable, InventoryMovement, Tenant, PlatformSetting, Customer, Product]),
    NcfSequencesModule,
    CashRegisterModule,
    AlanubeModule,
  ],
  controllers: [SalesController, SalesPublicController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
