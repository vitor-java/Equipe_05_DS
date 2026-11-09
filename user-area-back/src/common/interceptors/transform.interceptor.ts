
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  statusCode: number;
  timestamp: string;
  path: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) {
          return data;
        }

        return {
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
          path: request.url,
          data,
        };
      }),
    );
  }
}
