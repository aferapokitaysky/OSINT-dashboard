import ExifParser from 'exif-parser';
import { PDFParse } from 'pdf-parse';

// "Metadata absent" is a normal, honest result (coordination/FILE_INTELLIGENCE.md
// UX note) — every field here is nullable rather than omitted, so the caller
// can tell "we looked and there was nothing" from "we didn't look".

export interface ExifMetadata {
  capturedAt: string | null;
  cameraMake: string | null;
  cameraModel: string | null;
  software: string | null;
  orientation: number | null;
  gps: { latitude: number; longitude: number; altitude: number | null } | null;
  dimensions: { width: number; height: number } | null;
}

export function extractExif(buffer: Buffer, warnings: string[]): ExifMetadata {
  const empty: ExifMetadata = {
    capturedAt: null,
    cameraMake: null,
    cameraModel: null,
    software: null,
    orientation: null,
    gps: null,
    dimensions: null,
  };

  try {
    const result = ExifParser.create(buffer).parse();
    const tags = result.tags ?? {};

    if (result.errors?.length) {
      warnings.push(...result.errors.map((e) => `EXIF: ${e}`));
    }

    const hasGps = typeof tags.GPSLatitude === 'number' && typeof tags.GPSLongitude === 'number';

    return {
      capturedAt: typeof tags.DateTimeOriginal === 'number' ? new Date(tags.DateTimeOriginal * 1000).toISOString() : null,
      cameraMake: tags.Make ?? null,
      cameraModel: tags.Model ?? null,
      software: tags.Software ?? null,
      orientation: typeof tags.Orientation === 'number' ? tags.Orientation : null,
      gps: hasGps
        ? {
            latitude: tags.GPSLatitude as number,
            longitude: tags.GPSLongitude as number,
            altitude: typeof tags.GPSAltitude === 'number' ? tags.GPSAltitude : null,
          }
        : null,
      dimensions: result.imageSize ? { width: result.imageSize.width, height: result.imageSize.height } : null,
    };
  } catch (err) {
    // A JPEG with no EXIF segment at all throws in exif-parser rather than
    // returning empty tags — that's still "no metadata found", not a failure.
    warnings.push(`EXIF: ${(err as Error).message}`);
    return empty;
  }
}

export interface PdfMetadata {
  pageCount: number | null;
  title: string | null;
  author: string | null;
  creator: string | null;
  producer: string | null;
  createdAt: string | null;
  modifiedAt: string | null;
}

export async function extractPdfInfo(buffer: Buffer, warnings: string[]): Promise<PdfMetadata> {
  const empty: PdfMetadata = {
    pageCount: null,
    title: null,
    author: null,
    creator: null,
    producer: null,
    createdAt: null,
    modifiedAt: null,
  };

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getInfo();
    const info = (result.info ?? {}) as Record<string, string | undefined>;
    const dates = result.getDateNode();

    return {
      pageCount: result.total ?? null,
      title: info.Title || null,
      author: info.Author || null,
      creator: info.Creator || null,
      producer: info.Producer || null,
      createdAt: dates.CreationDate ? dates.CreationDate.toISOString() : null,
      modifiedAt: dates.ModDate ? dates.ModDate.toISOString() : null,
    };
  } catch (err) {
    warnings.push(`PDF: ${(err as Error).message}`);
    return empty;
  } finally {
    await parser.destroy();
  }
}
