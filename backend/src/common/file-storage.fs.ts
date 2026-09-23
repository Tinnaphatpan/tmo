import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AppConfig } from '../config/configuration';
import { FileStorage } from './file-storage';

@Injectable()
export class FilesystemFileStorage extends FileStorage {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    super();
  }

  async savePdf(filename: string, buffer: Buffer): Promise<string> {
    const dir = this.configService.get('storage', { infer: true }).pdfDir;
    return this.save(dir, filename, buffer);
  }

  async saveSignature(filename: string, buffer: Buffer): Promise<string> {
    const dir = this.configService.get('storage', { infer: true }).signatureDir;
    return this.save(dir, filename, buffer);
  }

  async readFile(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  private async save(dir: string, filename: string, buffer: Buffer): Promise<string> {
    await fs.mkdir(dir, { recursive: true });
    const fullPath = path.join(dir, filename);
    await fs.writeFile(fullPath, buffer);
    return fullPath;
  }
}
