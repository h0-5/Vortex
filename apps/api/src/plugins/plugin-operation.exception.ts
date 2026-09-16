import { HttpException, HttpStatus } from '@nestjs/common';

export class PluginOperationException extends HttpException {
  constructor(
    code: string,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
    details: Record<string, unknown> = {},
  ) {
    super({ error: { code, message, details } }, status);
  }
}
