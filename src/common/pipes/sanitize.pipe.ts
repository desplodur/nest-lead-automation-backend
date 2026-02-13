import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
} from '@nestjs/common';

const HTML_TAG_REGEX = /<[^>]*>/g;

/**
 * Strips HTML tags from string values to prevent XSS.
 * Applied to DTOs before validation; keeps validation separate from sanitization.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body' || value == null) {
      return value;
    }
    return this.sanitize(value);
  }

  private sanitize(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.replace(HTML_TAG_REGEX, '').trim();
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }
    if (value !== null && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = this.sanitize(v);
      }
      return out;
    }
    return value;
  }
}
