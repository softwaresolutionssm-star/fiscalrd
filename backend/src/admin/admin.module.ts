import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminPublicController } from './admin-public.controller';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Sale } from '../sales/entities/sale.entity';
import { NcfSequence } from '../ncf-sequences/entities/ncf-sequence.entity';
import { PlatformSetting } from './entities/platform-setting.entity';
import { Branch } from '../branches/entities/branch.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, Sale, NcfSequence, PlatformSetting, Branch]),
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signOptions: { expiresIn: (config.get<string>('jwt.expiresIn') ?? '7d') as any },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController, AdminPublicController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
