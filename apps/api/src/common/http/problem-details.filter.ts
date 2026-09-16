import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';

interface ValidationErrorItem {
  field: string;
  message: string;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const problem = this.createProblem(error, request);

    if (problem.status >= 500) {
      this.logger.error({
        requestId: request.requestId,
        error: error instanceof Error ? error.stack : error,
      });
    }

    response.status(problem.status).type('application/problem+json').send(problem);
  }

  private createProblem(error: unknown, request: Request) {
    if (error instanceof ZodError) {
      return this.createValidationProblem(error, request);
    }

    if (error instanceof HttpException) {
      return this.createHttpProblem(error, request);
    }

    return this.createInternalProblem(request);
  }

  private createValidationProblem(error: ZodError, request: Request) {
    const errors: ValidationErrorItem[] = error.issues.map((issue) => ({
      field: issue.path.join('.') || 'request',
      message: issue.message,
    }));

    return {
      type: 'about:blank',
      title: 'Validation Error',
      status: HttpStatus.BAD_REQUEST,
      detail: 'The request did not pass validation.',
      instance: request.originalUrl,
      requestId: request.requestId,
      errors,
    };
  }

  private createHttpProblem(error: HttpException, request: Request) {
    const status = error.getStatus();
    const response = error.getResponse();

    if (typeof response === 'object' && response !== null && 'error' in response) {
      return {
        type: 'about:blank',
        title: getProblemTitle(status),
        status,
        detail: (response.error as { message?: string }).message ?? 'Plugin operation failed.',
        instance: request.originalUrl,
        requestId: request.requestId,
        ...response,
      };
    }

    const detail = getHttpExceptionDetail(error);

    return {
      type: 'about:blank',
      title: getProblemTitle(status),
      status,
      detail,
      instance: request.originalUrl,
      requestId: request.requestId,
    };
  }

  private createInternalProblem(request: Request) {
    return {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred.',
      instance: request.originalUrl,
      requestId: request.requestId,
    };
  }
}

function getHttpExceptionDetail(error: HttpException): string {
  const response = error.getResponse();
  if (typeof response === 'string') {
    return response;
  }

  const message = 'message' in response ? response.message : undefined;
  if (Array.isArray(message)) {
    return message.map(String).join(', ');
  }
  return typeof message === 'string' ? message : error.message;
}

function getProblemSlug(status: number): string {
  return getProblemTitle(status).toLowerCase().replaceAll(' ', '-');
}

function getProblemTitle(status: number): string {
  return HttpStatus[status]?.replaceAll('_', ' ') ?? 'Request Error';
}
