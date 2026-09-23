import { FileStorage } from '../common/file-storage';

/** In-memory FileStorage for Use Case unit tests — no real disk I/O. */
export class FakeFileStorage extends FileStorage {
  readonly pdfs = new Map<string, Buffer>();
  readonly signatures = new Map<string, Buffer>();

  async savePdf(filename: string, buffer: Buffer): Promise<string> {
    const path = `fake://pdf/${filename}`;
    this.pdfs.set(path, buffer);
    return path;
  }

  async saveSignature(filename: string, buffer: Buffer): Promise<string> {
    const path = `fake://signature/${filename}`;
    this.signatures.set(path, buffer);
    return path;
  }

  async readFile(path: string): Promise<Buffer> {
    const buffer = this.pdfs.get(path) ?? this.signatures.get(path);
    if (!buffer) throw new Error(`FakeFileStorage: no file at ${path}`);
    return buffer;
  }
}
