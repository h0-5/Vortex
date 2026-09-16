import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp, { type OutputInfo } from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = resolve(join(__dirname, '..', '..', 'public', 'uploads'));

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ProcessedUpload {
  filename: string;
  publicUrl: string;
  width: number;
  height: number;
}

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/x-icon']);
const SVG_MIME_TYPE = 'image/svg+xml';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class SettingsUploadService {
  readonly uploadsDir = UPLOADS_DIR;

  async processImage(
    kind: 'logo' | 'favicon' | 'pwa_icon',
    file: UploadedFile,
  ): Promise<ProcessedUpload> {
    this.validateFile(file);

    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    if (file.mimetype === SVG_MIME_TYPE) {
      return this.saveSvg(file);
    }

    const { data, info } = await this.transformImage(kind, file);
    const extension = this.safeExtension(info.format ?? 'png');
    const filename = `${randomUUID()}.${extension}`;
    const filepath = this.safePath(filename);

    await sharp(data).toFile(filepath);

    return {
      filename,
      publicUrl: `/api/v1/settings/assets/${filename}`,
      width: info.width,
      height: info.height,
    };
  }

  private async transformImage(
    kind: 'logo' | 'favicon' | 'pwa_icon',
    file: UploadedFile,
  ): Promise<{ data: Buffer; info: OutputInfo }> {
    let pipeline = sharp(file.buffer);

    switch (kind) {
      case 'logo':
        pipeline = pipeline.resize(512, 512, { fit: 'inside', withoutEnlargement: true });
        break;
      case 'favicon':
        pipeline = pipeline.resize(64, 64, { fit: 'inside', withoutEnlargement: true });
        break;
      case 'pwa_icon':
        pipeline = pipeline.resize(512, 512, { fit: 'inside', withoutEnlargement: true });
        break;
    }

    return pipeline.png({ compressionLevel: 9, force: false }).toBuffer({ resolveWithObject: true });
  }

  private saveSvg(file: UploadedFile): ProcessedUpload {
    const filename = `${randomUUID()}.svg`;
    const filepath = this.safePath(filename);

    const content = file.buffer.toString('utf8');
    const dangerousPatterns = [
      /<script\b/i,
      /on\w+\s*=/i,
      /javascript:/i,
      /data:text\/html/i,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        throw new BadRequestException('SVG file contains potentially unsafe content.');
      }
    }

    writeFileSync(filepath, file.buffer);

    return {
      filename,
      publicUrl: `/api/v1/settings/assets/${filename}`,
      width: 0,
      height: 0,
    };
  }

  private validateFile(file: UploadedFile): void {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded.');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
      );
    }

    if (file.mimetype === SVG_MIME_TYPE) {
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: png, jpeg, webp, svg.`,
      );
    }

    const ext = extname(file.originalname).toLowerCase();
    const executableExtensions = new Set(['.exe', '.bat', '.cmd', '.sh', '.msi', '.dll', '.jar']);
    if (executableExtensions.has(ext)) {
      throw new BadRequestException('Executable files are not allowed.');
    }
  }

  private safePath(filename: string): string {
    const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const resolved = normalize(resolve(UPLOADS_DIR, safeName));
    if (!resolved.startsWith(UPLOADS_DIR)) {
      throw new BadRequestException('Invalid file path.');
    }
    return resolved;
  }

  private safeExtension(format: string): string {
    switch (format) {
      case 'jpeg':
      case 'jpg':
        return 'jpg';
      case 'webp':
        return 'webp';
      case 'png':
      default:
        return 'png';
    }
  }
}
