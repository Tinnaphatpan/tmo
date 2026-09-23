/**
 * Filesystem storage for generated PDFs and uploaded signature images
 * (score-approval workflow). Abstracted the same way DB repositories are —
 * so use-cases stay unit-testable against fakes with zero real I/O, matching
 * this codebase's "Use Case layer needs no DB" testing philosophy.
 */
export abstract class FileStorage {
  /** Returns the path the PDF was written to. */
  abstract savePdf(filename: string, buffer: Buffer): Promise<string>;
  /** Returns the path the signature image was written to. */
  abstract saveSignature(filename: string, buffer: Buffer): Promise<string>;
  /** Reads back a previously saved file (for streaming to the client). */
  abstract readFile(path: string): Promise<Buffer>;
}
