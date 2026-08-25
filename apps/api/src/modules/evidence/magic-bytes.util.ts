// Detects file type from its actual bytes, never from the client-declared
// Content-Type header or filename extension — both are attacker-controlled.
// Deliberately small: only the types this module knows how to analyze.
// coordination/FILE_INTELLIGENCE.md ("MIME сверяется с magic bytes").

export type DetectedFileType = 'image/jpeg' | 'image/png' | 'application/pdf';

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF_MAGIC = '%PDF-';

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, i) => buffer[i] === byte);
}

export function detectMagicBytes(buffer: Buffer): DetectedFileType | null {
  if (startsWith(buffer, JPEG_MAGIC)) return 'image/jpeg';
  if (startsWith(buffer, PNG_MAGIC)) return 'image/png';
  if (buffer.length >= PDF_MAGIC.length && buffer.subarray(0, PDF_MAGIC.length).toString('ascii') === PDF_MAGIC) {
    return 'application/pdf';
  }
  return null;
}

// Soft allowlist used at upload time (Multer fileFilter) — only sees the
// declared Content-Type, so it's a UX shortcut ("reject obviously wrong
// uploads early"), not the security boundary. The real check is
// detectMagicBytes() above, run on the actual bytes after upload.
export const ALLOWED_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
