import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersRepository } from '../../modules/users/users.repository';
import { JwtPayload } from '../../auth/jwt-payload.interface';
import { User } from '../../domain/entities';

declare module 'express' {
  interface Request {
    user?: User;
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/**
 * SPEC §2.2: verify the JWT signature, THEN re-query the DB for the user on
 * every request — a JWT stays cryptographically valid until it expires even
 * if the user was deleted or had their role changed in the meantime, so the
 * token's claims are never trusted on their own. Downstream guards/handlers
 * read the freshly-fetched `request.user`, not the JWT payload.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedException('ไม่ได้เข้าสู่ระบบ');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }

    const user = await this.usersRepository.findById(payload.id);
    if (!user) {
      throw new UnauthorizedException('ไม่พบผู้ใช้นี้ในระบบ');
    }

    req.user = user;
    return true;
  }
}
