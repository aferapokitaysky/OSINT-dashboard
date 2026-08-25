// exif-parser ships no type definitions and there's no @types package for
// it. Minimal ambient declaration covering only what metadata-extractors.ts
// actually reads — not a full surface of the library.
declare module 'exif-parser' {
  export interface ExifTags {
    Make?: string;
    Model?: string;
    Software?: string;
    Orientation?: number;
    DateTimeOriginal?: number; // unix seconds
    GPSLatitude?: number; // signed decimal degrees
    GPSLongitude?: number; // signed decimal degrees
    GPSAltitude?: number;
    [key: string]: unknown;
  }

  export interface ExifImageSize {
    width: number;
    height: number;
  }

  export interface ExifParseResult {
    tags: ExifTags;
    imageSize?: ExifImageSize;
    errors?: string[];
  }

  export interface ExifParser {
    parse(): ExifParseResult;
  }

  const ExifParserModule: {
    create(buffer: Buffer): ExifParser;
  };

  export default ExifParserModule;
}
