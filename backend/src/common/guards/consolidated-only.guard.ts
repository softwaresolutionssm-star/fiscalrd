import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Bloquea el acceso a módulos fiscales/contables consolidados
 * cuando el usuario es ADMIN asignado a una sucursal específica.
 *
 * Regla: La DGII conoce un solo RNC — el negocio completo.
 * Un admin de sucursal no puede ver ni operar datos fiscales consolidados.
 * Solo pueden: OWNER, ACCOUNTANT (global), SUPER_ADMIN, y ADMIN sin sucursal asignada.
 */
@Injectable()
export class ConsolidatedOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role === 'admin' && user?.branchId) {
      throw new ForbiddenException(
        'Los administradores de sucursal no tienen acceso a datos fiscales consolidados. Contacta al contador o dueño del negocio.',
      );
    }
    return true;
  }
}
