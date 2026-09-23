import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { FileStorage } from '../../../common/file-storage';
import { UsersRepository } from '../../users/users.repository';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

export interface UploadSignatureInput {
  userId: string;
  originalname: string;
  buffer: Buffer;
}

/** SPEC-driven refactor's e-signature workflow: an admin pre-registers a
 * signature image per user, retrieved and stamped automatically at score
 * approval time (never drawn live) — see ApproveScoreSetUseCase. */
@Injectable()
export class UploadSignatureUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(input: UploadSignatureInput): Promise<{ signaturePath: string }> {
    const user = await this.usersRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้นี้');
    }

    const ext = path.extname(input.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('รองรับเฉพาะไฟล์ PNG หรือ JPEG เท่านั้น');
    }

    const signaturePath = await this.fileStorage.saveSignature(
      `${input.userId}${ext}`,
      input.buffer,
    );
    await this.usersRepository.updateSignaturePath(input.userId, signaturePath);
    return { signaturePath };
  }
}
