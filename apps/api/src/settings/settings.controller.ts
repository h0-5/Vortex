import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  appSettingsSchema,
  appSettingsSectionIdSchema,
  settingsUploadKindSchema,
  updateAppSettingsSchema,
  type AppSettings,
  type AppSettingsSectionId,
  type UpdateAppSettings,
} from '@vortex/types';
import type { Request, Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';

import { SameOriginGuard } from '../common/guards/same-origin.guard.js';
import { SessionAuthGuard } from '../common/guards/session-auth.guard.js';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe.js';
import { SettingsService } from './settings.service.js';
import { SettingsUploadService, type UploadedFile as SettingsUploadedFile } from './settings-upload.service.js';

const multerFileFilter = (
  _request: Request,
  file: { mimetype: string; originalname: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon']);
  if (allowed.has(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
  }
};

@Controller('settings')
@UseGuards(SessionAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly uploadService: SettingsUploadService,
  ) {}

  @Get()
  async getSettings(): Promise<AppSettings> {
    return this.settingsService.get();
  }

  @Patch()
  @UseGuards(SameOriginGuard)
  async updateSettings(
    @Req() request: Request,
    @Body(new ZodValidationPipe(updateAppSettingsSchema)) patch: UpdateAppSettings,
  ): Promise<AppSettings> {
    const updated = await this.settingsService.update(request.session.userId!, patch);
    return appSettingsSchema.parse(updated);
  }

  @Patch(':section')
  @UseGuards(SameOriginGuard)
  async updateSection(
    @Req() request: Request,
    @Param('section', new ZodValidationPipe(appSettingsSectionIdSchema)) section: AppSettingsSectionId,
    @Body() patch: Record<string, unknown>,
  ): Promise<AppSettings> {
    const updated = await this.settingsService.updateSection(request.session.userId!, section, patch);
    return appSettingsSchema.parse(updated);
  }

  @Post('branding/:kind')
  @UseGuards(SameOriginGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: multerFileFilter,
    }),
  )
  async uploadBrandingAsset(
    @Req() request: Request,
    @Param('kind', new ZodValidationPipe(settingsUploadKindSchema)) kind: 'logo' | 'favicon' | 'pwa_icon',
    @UploadedFile() file: SettingsUploadedFile,
  ): Promise<AppSettings> {
    if (!file) {
      throw new BadRequestException('No valid image file uploaded.');
    }
    const updated = await this.settingsService.uploadBrandingAsset(request.session.userId!, kind, file);
    return appSettingsSchema.parse(updated);
  }

  @Get('manifest.json')
  async getManifest(): Promise<Record<string, unknown>> {
    const settings = await this.settingsService.get();
    return {
      name: settings.general.appName,
      short_name: settings.pwa.shortName ?? settings.general.appName,
      start_url: '/',
      display: 'standalone',
      background_color: settings.pwa.backgroundColor,
      theme_color: settings.pwa.themeColor,
      icons: settings.branding.logoUrl
        ? [
            { src: settings.branding.logoUrl, sizes: '512x512', type: 'image/png' },
            { src: settings.branding.faviconUrl ?? settings.branding.logoUrl, sizes: '192x192' },
          ]
        : [],
    };
  }

  @Get('assets/:filename')
  serveAsset(@Param('filename') filename: string, @Res() response: Response): void {
    const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filePath = join(this.uploadService.uploadsDir, safeName);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Asset not found.');
    }
    const stream = createReadStream(filePath);
    stream.pipe(response);
  }
}
