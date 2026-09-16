import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream, existsSync } from 'node:fs';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDiscordSnowflake } from '@vortex/shared';
import {
  commandIdSchema,
  deletePluginSchema,
  duplicatePluginTemplateSchema,
  pluginIdSchema,
  pluginStorageValueSchema,
  savePluginTemplateSchema,
  testTemplateSchema,
  updatePluginCommandSchema,
  updatePluginLogSettingsSchema,
  type DeletePluginRequest,
  type DuplicatePluginTemplate,
  type GuildPlugin,
  type GuildPluginDetail,
  type GuildPluginListResponse,
  type PluginCommand,
  type PluginCommandListResponse,
  type PluginLogListResponse,
  type PluginLogSettings,
  type PluginTemplate,
  type PluginTemplateListResponse,
  type PluginTestResult,
  type SavePluginTemplate,
  type TestTemplate,
  type UpdatePluginCommand,
  type UpdatePluginLogSettings,
} from '@vortex/types';
import type { Request } from 'express';
import type { Response } from 'express';
import { z } from 'zod';

import { ActivityService } from '../activity/activity.service.js';
import { SameOriginGuard } from '../common/guards/same-origin.guard.js';
import { SessionAuthGuard } from '../common/guards/session-auth.guard.js';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe.js';
import { GuildAccessService } from '../guilds/guild-access.service.js';
import { PluginCoreRepository } from './plugin-core.repository.js';
import { PluginManager } from './plugin-manager.service.js';
import { PluginOperationException } from './plugin-operation.exception.js';
import { PluginTestService } from './plugin-test.service.js';
import { PluginUploadService } from './plugin-upload.service.js';

const guildIdPipe = new ZodValidationPipe(
  z.string().refine(isDiscordSnowflake, 'Guild ID must be a Discord snowflake.'),
);
const pluginIdPipe = new ZodValidationPipe(pluginIdSchema);
const commandIdPipe = new ZodValidationPipe(commandIdSchema);
const storageKeyPipe = new ZodValidationPipe(
  z.string().min(1).max(255).regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/u),
);
const templateNamePipe = new ZodValidationPipe(z.string().min(1).max(100));

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

const UPLOAD_TEMP_DIR = join(process.cwd(), 'storage', 'tmp', 'plugin-uploads');

const pluginUploadInterceptor = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
      cb(null, UPLOAD_TEMP_DIR);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = file.originalname.toLowerCase().split('.').pop() ?? 'vortex';
      cb(null, `${unique}.${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const extension = file.originalname.toLowerCase().split('.').pop();
    if (extension === 'vortex' || extension === 'codenexus') {
      callback(null, true);
      return;
    }
    callback(new Error('Only .vortex and .codenexus files are allowed.'), false);
  },
});

@Controller('guilds/:guildId/plugins')
@UseGuards(SessionAuthGuard)
export class PluginsController {
  constructor(
    private readonly guildAccessService: GuildAccessService,
    private readonly pluginManager: PluginManager,
    private readonly pluginCoreRepository: PluginCoreRepository,
    private readonly pluginTestService: PluginTestService,
    private readonly activityService: ActivityService,
    private readonly pluginUploadService: PluginUploadService,
  ) {}

  @Get()
  async listPlugins(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
  ): Promise<GuildPluginListResponse> {
    await this.assertConnectedGuild(request, guildId);
    return { data: await this.pluginManager.listPlugins(guildId) };
  }

  @Get(':pluginId')
  async getPlugin(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
  ): Promise<GuildPluginDetail> {
    await this.assertPluginAccess(request, guildId, pluginId);
    return this.pluginManager.getPluginDetail(guildId, pluginId);
  }

  @Get(':pluginId/assets/:filename')
  async servePluginAsset(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
    @Param('filename') filename: string,
    @Res() response: Response,
  ): Promise<void> {
    await this.assertPluginAccess(request, guildId, pluginId);
    for (const filePath of this.pluginManager.getPluginAssetPath(pluginId, filename)) {
      if (existsSync(filePath)) {
        createReadStream(filePath).pipe(response);
        return;
      }
    }
    throw new HttpException('Plugin asset not found.', HttpStatus.NOT_FOUND);
  }

  @Get(':pluginId/commands')
  async listCommands(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
  ): Promise<PluginCommandListResponse> {
    await this.assertPluginAccess(request, guildId, pluginId);
    return { data: await this.pluginCoreRepository.listCommands({ guildId, pluginId }) };
  }

  @Patch(':pluginId/commands/:commandId')
  @UseGuards(SameOriginGuard)
  async updateCommand(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
    @Param('commandId', commandIdPipe) commandId: string,
    @Body(new ZodValidationPipe(updatePluginCommandSchema)) update: UpdatePluginCommand,
  ): Promise<PluginCommand> {
    await this.assertPluginAccess(request, guildId, pluginId);
    return this.pluginCoreRepository.updateCommand({ guildId, pluginId }, commandId, update);
  }

  @Get(':pluginId/log-settings')
  async getLogSettings(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
  ): Promise<PluginLogSettings> {
    await this.assertPluginAccess(request, guildId, pluginId);
    return this.pluginCoreRepository.getLogSettings({ guildId, pluginId });
  }

  @Patch(':pluginId/log-settings')
  @UseGuards(SameOriginGuard)
  async updateLogSettings(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
    @Body(new ZodValidationPipe(updatePluginLogSettingsSchema))
    update: UpdatePluginLogSettings,
  ): Promise<PluginLogSettings> {
    await this.assertPluginAccess(request, guildId, pluginId);
    return this.pluginCoreRepository.updateLogSettings({ guildId, pluginId }, update);
  }

  @Get(':pluginId/storage/:key')
  async getStorageValue(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
    @Param('key', storageKeyPipe) key: string,
  ): Promise<{ value: unknown }> {
    await this.assertPluginAccess(request, guildId, pluginId);
    return { value: await this.pluginCoreRepository.get({ guildId, pluginId }, key) };
  }

  @Put(':pluginId/storage/:key')
  @UseGuards(SameOriginGuard)
  async setStorageValue(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
    @Param('key', storageKeyPipe) key: string,
    @Body(new ZodValidationPipe(pluginStorageValueSchema)) body: { value: unknown },
  ): Promise<{ value: unknown }> {
    await this.assertPluginAccess(request, guildId, pluginId);
    await this.pluginCoreRepository.set({ guildId, pluginId }, key, body.value);
    return body;
  }

  @Get(':pluginId/templates')
  async listTemplates(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
  ): Promise<PluginTemplateListResponse> {
    await this.assertPluginAccess(request, guildId, pluginId);
    return { data: await this.pluginCoreRepository.listTemplates({ guildId, pluginId }) };
  }

  @Post(':pluginId/templates')
  @UseGuards(SameOriginGuard)
  async saveTemplate(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
    @Body(new ZodValidationPipe(savePluginTemplateSchema)) template: SavePluginTemplate,
  ): Promise<PluginTemplate> {
    await this.assertPluginAccess(request, guildId, pluginId);
    return this.pluginCoreRepository.save({ guildId, pluginId }, template);
  }

  @Post(':pluginId/templates/:name/duplicate')
  @UseGuards(SameOriginGuard)
  async duplicateTemplate(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
    @Param('name', templateNamePipe) name: string,
    @Body(new ZodValidationPipe(duplicatePluginTemplateSchema)) body: DuplicatePluginTemplate,
  ): Promise<PluginTemplate> {
    await this.assertPluginAccess(request, guildId, pluginId);
    return this.pluginCoreRepository.duplicateTemplate({ guildId, pluginId }, name, body.name);
  }

  @Delete(':pluginId/templates/:name')
  @UseGuards(SameOriginGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
    @Param('name', templateNamePipe) name: string,
  ): Promise<void> {
    await this.assertPluginAccess(request, guildId, pluginId);
    await this.pluginCoreRepository.deleteTemplate({ guildId, pluginId }, name);
  }

  @Post(':pluginId/templates/:name/test')
  @UseGuards(SameOriginGuard)
  async testTemplate(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
    @Param('name', templateNamePipe) name: string,
    @Body(new ZodValidationPipe(testTemplateSchema)) body: TestTemplate,
  ): Promise<PluginTestResult> {
    await this.assertPluginAccess(request, guildId, pluginId);
    return this.pluginTestService.sendTemplate(
      { guildId, pluginId },
      name,
      { ...(body.channelId ? { channelId: body.channelId } : {}), ...(body.userId ? { userId: body.userId } : {}) },
      body.variables,
    );
  }

  @Post('upload')
  @UseGuards(SameOriginGuard)
  @UseInterceptors(pluginUploadInterceptor)
  @HttpCode(HttpStatus.OK)
  async uploadPlugin(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @UploadedFile() file: MulterFile | undefined,
  ): Promise<GuildPlugin> {
    await this.assertConnectedGuild(request, guildId);
    if (!file?.path) {
      throw new PluginOperationException(
        'PLUGIN_UPLOAD_FILE_MISSING',
        'No plugin archive file was received.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const manifest = await this.pluginUploadService.upload(file, guildId);
    const plugin = await this.pluginManager.getPluginStatus(guildId, manifest.id);
    await this.activityService.record(request.session.userId!, {
      guildId,
      pluginId: manifest.id,
      action: 'plugin.uploaded',
      resourceType: 'plugin',
      resourceId: manifest.id,
      type: 'plugin.uploaded',
      message: `Uploaded plugin ${manifest.name} to server ${guildId}`,
      newValue: { installed: true, enabled: false },
      metadata: { pluginId: manifest.id, pluginName: manifest.name, guildId },
    });
    return plugin;
  }

  @Post(':pluginId/enable')
  @UseGuards(SameOriginGuard)
  @HttpCode(HttpStatus.OK)
  async enablePlugin(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
  ): Promise<GuildPlugin> {
    await this.assertConnectedGuild(request, guildId);
    try {
      const plugin = await this.pluginManager.enablePlugin(guildId, pluginId);
      await this.activityService.record(request.session.userId!, {
        guildId,
        pluginId,
        action: 'plugin.enabled',
        resourceType: 'plugin',
        resourceId: pluginId,
        type: 'plugin.enabled',
        message: `Enabled plugin ${plugin.name} in server ${guildId}`,
        newValue: { enabled: true },
        metadata: { pluginId, pluginName: plugin.name, guildId },
      });
      return plugin;
    } catch (error) {
      throw this.toPluginOperationError('PLUGIN_ENABLE_FAILED', error, pluginId);
    }
  }

  @Post(':pluginId/disable')
  @UseGuards(SameOriginGuard)
  @HttpCode(HttpStatus.OK)
  async disablePlugin(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
  ): Promise<GuildPlugin> {
    await this.assertConnectedGuild(request, guildId);
    try {
      const plugin = await this.pluginManager.disablePlugin(guildId, pluginId);
      await this.activityService.record(request.session.userId!, {
        guildId,
        pluginId,
        action: 'plugin.disabled',
        resourceType: 'plugin',
        resourceId: pluginId,
        type: 'plugin.disabled',
        message: `Disabled plugin ${plugin.name} in server ${guildId}`,
        newValue: { enabled: false },
        metadata: { pluginId, pluginName: plugin.name, guildId },
      });
      return plugin;
    } catch (error) {
      throw this.toPluginOperationError('PLUGIN_DISABLE_FAILED', error, pluginId);
    }
  }

  @Get(':pluginId/logs')
  async listPluginLogs(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
  ): Promise<PluginLogListResponse> {
    await this.assertConnectedGuild(request, guildId);
    return { data: await this.pluginManager.listPluginLogs(guildId, pluginId) };
  }

  @Delete(':pluginId')
  @UseGuards(SameOriginGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlugin(
    @Req() request: Request,
    @Param('guildId', guildIdPipe) guildId: string,
    @Param('pluginId', pluginIdPipe) pluginId: string,
    @Body(new ZodValidationPipe(deletePluginSchema)) body: DeletePluginRequest,
  ): Promise<void> {
    await this.assertConnectedGuild(request, guildId);
    try {
      await this.pluginManager.deletePlugin(guildId, pluginId, body.deleteData);
      await this.activityService.record(request.session.userId!, {
        guildId,
        pluginId,
        action: 'plugin.deleted',
        resourceType: 'plugin',
        resourceId: pluginId,
        type: 'plugin.deleted',
        message: `Deleted plugin ${pluginId} from server ${guildId}`,
        newValue: { deleted: true, dataRemoved: body.deleteData },
        metadata: { pluginId, guildId, deleteData: body.deleteData },
      });
    } catch (error) {
      throw this.toPluginOperationError('PLUGIN_DELETE_FAILED', error, pluginId);
    }
  }

  private async assertConnectedGuild(request: Request, guildId: string): Promise<void> {
    await this.guildAccessService.getConnectedGuild(request.session.userId!, guildId);
  }

  private async assertPluginAccess(
    request: Request,
    guildId: string,
    pluginId: string,
  ): Promise<void> {
    await this.assertConnectedGuild(request, guildId);
    await this.pluginManager.getPluginStatus(guildId, pluginId);
  }

  private toPluginOperationError(
    code: string,
    error: unknown,
    pluginId: string,
  ): PluginOperationException {
    if (error instanceof PluginOperationException) {
      return error;
    }
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const message = typeof response === 'string' ? response : error.message;
      return new PluginOperationException(code, message, error.getStatus(), { pluginId });
    }
    const message = error instanceof Error ? error.message : 'Plugin operation failed.';
    return new PluginOperationException(code, message, HttpStatus.INTERNAL_SERVER_ERROR, {
      pluginId,
    });
  }
}
