import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY, RAW_RESPONSE_KEY } from './decorators';
import { ApiPayload } from './api-payload';

// Reproduces utils/ApiResponse.success envelope: { success, message, data, meta? }.
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (raw) return next.handle();

    const defaultMessage =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 'Success';

    return next.handle().pipe(
      map((value) => {
        if (value instanceof ApiPayload) {
          const body: any = {
            success: true,
            message: value.message ?? defaultMessage,
            data: value.data === undefined ? null : value.data,
          };
          if (value.meta) body.meta = value.meta;
          return body;
        }
        return {
          success: true,
          message: defaultMessage,
          data: value === undefined ? null : value,
        };
      }),
    );
  }
}
