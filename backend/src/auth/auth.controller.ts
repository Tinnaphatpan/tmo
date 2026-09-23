import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../domain/entities';
import { JwtPayload } from './jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto.username, dto.password);
  }

  /** The caller as the DB sees them *now* (AuthGuard re-queries) — lets the
   * frontend detect a role changed after the JWT was issued. */
  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User): JwtPayload {
    return this.authService.toPayload(user);
  }
}
