import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadSignatureUseCase } from './use-cases/upload-signature.use-case';

// Admin-only: pre-register a user's e-signature image ahead of the score
// approval workflow (ApproveScoreSetUseCase requires one on file).
@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly uploadSignature: UploadSignatureUseCase) {}

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
