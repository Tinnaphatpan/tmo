import { Global, Module } from '@nestjs/common';
import { FileStorage } from './file-storage';
import { FilesystemFileStorage } from './file-storage.fs';

@Global()
@Module({
  providers: [{ provide: FileStorage, useClass: FilesystemFileStorage }],
  exports: [FileStorage],
})
export class FileStorageModule {}
