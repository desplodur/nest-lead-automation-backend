import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

const RATE_LIMIT_MESSAGE =
  'Rate limit exceeded. Please try again later.';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(): never {
    throw new ThrottlerException(RATE_LIMIT_MESSAGE);
  }
}
