import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../modules/users/users.repository';
import { JwtPayload } from './jwt-payload.interface';
import { User } from '../domain/entities';

export interface LoginResult {
  token: string;
  user: JwtPayload;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string): Promise<LoginResult> {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    const payload = this.toPayload(user);
    const token = this.jwtService.sign(payload);
    return { token, user: payload };
  }

  toPayload(user: User): JwtPayload {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      schoolId: user.schoolId,
    };
  }
}
