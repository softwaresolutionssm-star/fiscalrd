import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  firstName: string;
  lastName: string;
  branchId?: string | null;
  permissions?: string[] | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') ?? 'fallback-secret',
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id:          payload.sub,
      email:       payload.email,
      tenantId:    payload.tenantId,
      role:        payload.role,
      firstName:   payload.firstName,
      lastName:    payload.lastName,
      branchId:    payload.branchId ?? null,
      permissions: payload.permissions ?? null,
    };
  }
}
