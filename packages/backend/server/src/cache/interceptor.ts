import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { mergeMap, Observable, of } from 'rxjs';

import { LocalCache } from './cache';

export const MakeCache = (key: string[], args?: string[]) =>
  SetMetadata('cacheKey', [key, args]);
export const PreventCache = (key: string[], args?: string[]) =>
  SetMetadata('preventCache', [key, args]);

type CacheConfig = [string[], string[]?];

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  constructor(
    private readonly reflector: Reflector,
    private readonly cache: LocalCache
  ) {}
  async intercept(
    ctx: ExecutionContext,
    next: CallHandler<any>
  ): Promise<Observable<any>> {
    const key = this.reflector.get<CacheConfig | undefined>(
      'cacheKey',
      ctx.getHandler()
    );
    const preventKey = this.reflector.get<CacheConfig | undefined>(
      'preventCache',
      ctx.getHandler()
    );

    if (preventKey) {
      this.logger.debug(`prevent cache: ${JSON.stringify(preventKey)}`);
      const key = await this.getCacheKey(ctx, preventKey);
      if (key) {
        await this.cache.delete(key);
      }

      return next.handle();
    } else if (!key) {
      return next.handle();
    }

    const cacheKey = await this.getCacheKey(ctx, key);

    if (!cacheKey) {
      return next.handle();
    }

    const cachedData = await this.cache.get(cacheKey);

    if (cachedData) {
      this.logger.debug('cache hit', cacheKey, cachedData);
      return of(cachedData);
    } else {
      return next.handle().pipe(
        mergeMap(async result => {
          this.logger.debug('cache miss', cacheKey, result);
          await this.cache.set(cacheKey, result);

          return result;
        })
      );
    }
  }

  private async getCacheKey(
    ctx: ExecutionContext,
    config: CacheConfig
  ): Promise<string | null> {
    const [key, params] = config;

    if (!params) {
      return key.join(':');
    } else if (ctx.getType<GqlContextType>() === 'graphql') {
      const args = GqlExecutionContext.create(ctx).getArgs();
      const cacheKey = params
        .map(name => args[name])
        .filter(v => v)
        .join(':');
      if (cacheKey) {
        return [...key, cacheKey].join(':');
      } else {
        return key.join(':');
      }
    }
    return null;
  }
}
