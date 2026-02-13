import { ThrottlerException } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './custom-throttler.guard';

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;

  beforeEach(() => {
    guard = new CustomThrottlerGuard({} as never, {} as never);
  });

  it('throws ThrottlerException with custom message when limit exceeded', () => {
    expect(() => (guard as any).throwThrottlingException()).toThrow(ThrottlerException);
    expect(() => (guard as any).throwThrottlingException()).toThrow(
      'Rate limit exceeded. Please try again later.',
    );
  });
});
