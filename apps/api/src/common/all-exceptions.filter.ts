import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';

/**
 * 어떤 실패든 프론트에는 동일한 봉투로 내려간다.
 * 키움 원문 return_code 는 data.kiwoomCode 에만 담고 top-level code 와 섞지 않는다.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        code: HttpStatus.BAD_REQUEST,
        message: '요청 형식이 올바르지 않습니다',
        data: {
          kiwoomCode: null,
          detail: exception.issues.map((issue) => issue.path.join('.') + ': ' + issue.message).join(', '),
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      response.status(exception.getStatus()).json(
        typeof body === 'object' && body !== null && 'code' in body
          ? body
          : {
              code: exception.getStatus(),
              message: exception.message,
              data: { kiwoomCode: null, detail: null },
            },
      );
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '서버 내부 오류',
      data: { kiwoomCode: null, detail: null },
    });
  }
}
