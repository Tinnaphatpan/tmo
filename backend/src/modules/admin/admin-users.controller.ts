import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../domain/entities';
import { UploadSignatureUseCase } from './use-cases/upload-signature.use-case';
import { ChangeUserRoleUseCase } from './use-cases/change-user-role.use-case';
import { ChangeRoleDto } from './dto/change-role.dto';

// Admin-only: pre-register a user's e-signature image ahead of the score
// approval workflow (ApproveScoreSetUseCase requires one on file).
@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(
    private readonly uploadSignature: UploadSignatureUseCase,
    private readonly changeUserRole: ChangeUserRoleUseCase,
  ) {}

  @Patch(':id/role')
  async role(
    @Param('id') id: string,
    @CurrentUser() actor: User,
    @Body() dto: ChangeRoleDto,
  ) {
    await this.changeUserRole.execute({
      userId: id,
      actorId: actor.id,
      role: dto.role,
      assignments: dto.assignments,
      schoolId: dto.schoolId,
    });
    return { ok: true };
  }

  @Post(':id/signature')
  @UseInterceptors(FileInterceptor('file'))
  async signature(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('กรุณาแนบไฟล์');
    }
    await this.uploadSignature.execute({
      userId: id,
      originalname: file.originalname,
      buffer: file.buffer,
    });
    // Deliberately not echoing the stored path: it is a server filesystem location.
    return { ok: true };
  }
}
