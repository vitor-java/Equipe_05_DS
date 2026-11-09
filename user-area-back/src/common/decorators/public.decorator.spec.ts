import { describe, it, expect} from 'vitest';
import { IS_PUBLIC_KEY, Public } from './public.decorator';
describe('Public decorator', () => {
  it('marca handler como público', () => {
    class ControllerExample { @Public() handler() {} }
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, ControllerExample.prototype.handler)).toBe(true);
  });
});
