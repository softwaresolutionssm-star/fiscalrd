import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenants/entities/tenant.entity';
import { BlockedTenantGuard } from './common/guards/blocked-tenant.guard';
import envConfig from './config/env.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { EmployeesModule } from './employees/employees.module';
import { SalesModule } from './sales/sales.module';
import { PayrollModule } from './payroll/payroll.module';
import { NcfSequencesModule } from './ncf-sequences/ncf-sequences.module';
import { DgiiReportsModule } from './dgii-reports/dgii-reports.module';
import { AccountingModule } from './accounting/accounting.module';
import { CashBankModule } from './cash-bank/cash-bank.module';
import { StatsModule } from './stats/stats.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AccountsReceivableModule } from './accounts-receivable/accounts-receivable.module';
import { AccountsPayableModule } from './accounts-payable/accounts-payable.module';
import { InventoryModule } from './inventory/inventory.module';
import { QuotationsModule } from './quotations/quotations.module';
import { AdminModule } from './admin/admin.module';
import { AlanubeModule } from './alanube/alanube.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { MailModule } from './mail/mail.module';
import { SchedulesModule } from './schedules/schedules.module';
import { BillingModule } from './billing/billing.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ExpensesModule } from './expenses/expenses.module';
import { WithholdingsModule } from './withholdings/withholdings.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { BranchesModule } from './branches/branches.module';
import { YearClosingModule } from './year-closing/year-closing.module';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { RestaurantTablesModule } from './restaurant-tables/restaurant-tables.module';

@Module({
  imports: [
    // Config global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),

    // Rate limiting global
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1_000,     limit: 20  }, // 20 req/s por IP
      { name: 'medium', ttl: 60_000,    limit: 200 }, // 200 req/min
      { name: 'long',   ttl: 3_600_000, limit: 2000 }, // 2000 req/hora
    ]),

    // Base de datos via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get<string>('nodeEnv') === 'development', // Solo en desarrollo
        ssl: {
          rejectUnauthorized: false, // Requerido por Supabase
        },
        logging: config.get<string>('nodeEnv') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Módulos de la aplicación
    AuthModule,
    UsersModule,
    TenantsModule,
    CustomersModule,
    ProductsModule,
    SuppliersModule,
    EmployeesModule,
    SalesModule,
    PayrollModule,
    NcfSequencesModule,
    DgiiReportsModule,
    AccountingModule,
    CashBankModule,
    StatsModule,
    PurchasesModule,
    AccountsReceivableModule,
    AccountsPayableModule,
    InventoryModule,
    QuotationsModule,
    AdminModule,
    AlanubeModule,
    CashRegisterModule,
    MailModule,
    SchedulesModule,
    BillingModule,
    NotificationsModule,
    ExpensesModule,
    WithholdingsModule,
    AuditLogModule,
    BranchesModule,
    YearClosingModule,
    ServiceOrdersModule,
    AppointmentsModule,
    RestaurantTablesModule,
    TypeOrmModule.forFeature([Tenant]),
  ],
  providers: [
    BlockedTenantGuard,
    { provide: APP_GUARD, useExisting: BlockedTenantGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }