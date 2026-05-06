import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { SKIP_BILLING_BLOCK_KEY } from '../decorators/skip-billing-block.decorator';

@Injectable()
export class BlockedTenantGuard implements CanActivate {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Rutas marcadas con @SkipBillingBlock() siempre pasan (ej: billing/my)
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_BILLING_BLOCK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // Sin usuario autenticado o super_admin: dejar pasar
    if (!user || !user.tenantId || user.role === 'super_admin') return true;

    const tenant = await this.tenantRepo.findOne({
      where: { id: user.tenantId },
      select: { isBillingBlocked: true },
    });

    if (tenant?.isBillingBlocked) {
      throw new HttpException(
        {
          statusCode: 402,
          error: 'Payment Required',
          message: 'Tu cuenta está bloqueada por falta de pago. Ingresa a Facturación para regularizar tu situación.',
          code: 'BILLING_BLOCKED',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
