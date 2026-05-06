import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Reads the X-Branch-Filter header and, when the requesting user is an owner,
 * sets user.branchId to that value so all downstream service calls filter by
 * that branch automatically.
 *
 * This allows owners to "switch context" to a specific branch from the sidebar
 * without needing separate endpoints.
 */
@Injectable()
export class BranchFilterInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const branchFilter = request.headers['x-branch-filter'];

    if (user && user.role === 'owner' && branchFilter && typeof branchFilter === 'string') {
      // Override branchId for this request only (doesn't mutate the JWT)
      user.branchId = branchFilter;
    }

    return next.handle();
  }
}
