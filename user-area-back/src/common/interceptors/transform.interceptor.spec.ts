import { describe, it, expect} from 'vitest';
import { of, lastValueFrom } from 'rxjs';
import { StreamableFile } from '@nestjs/common';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  const makeContext = (url = '/api/test', statusCode = 200) => ({
    switchToHttp: () => ({
      getRequest: () => ({ url }),
      getResponse: () => ({ statusCode }),
    }),
  }) as any;

  it('envolve dados comuns no envelope padrão', async () => {
    const interceptor = new TransformInterceptor();

    const result = await lastValueFrom(
      interceptor.intercept(
        makeContext(),
        { handle: () => of({ ok: true }) } as any,
      ),
    );

    expect(result).toMatchObject({
      statusCode: 200,
      path: '/api/test',
      data: { ok: true },
    });

    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('não envolve StreamableFile', async () => {
    const interceptor = new TransformInterceptor();
    const file = new StreamableFile(Buffer.from('pdf'));

    const result = await lastValueFrom(
      interceptor.intercept(
        makeContext(),
        { handle: () => of(file) } as any,
      ),
    );

    expect(result).toBe(file);
  });
});
