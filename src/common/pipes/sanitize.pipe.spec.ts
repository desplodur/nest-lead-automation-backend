import { ArgumentMetadata } from '@nestjs/common';
import { SanitizePipe } from './sanitize.pipe';

describe('SanitizePipe', () => {
  const pipe = new SanitizePipe();
  const bodyMeta: ArgumentMetadata = { type: 'body', data: undefined };

  it('strips HTML tags from string', () => {
    expect(pipe.transform('<script>alert(1)</script>hello', bodyMeta)).toBe('alert(1)hello');
    expect(pipe.transform('a<b>c', bodyMeta)).toBe('ac');
    expect(pipe.transform('normal text', bodyMeta)).toBe('normal text');
    expect(pipe.transform('<img src=x onerror=alert(1)>', bodyMeta)).toBe('');
  });

  it('trims whitespace after stripping', () => {
    expect(pipe.transform('  <p>ok</p>  ', bodyMeta)).toBe('ok');
  });

  it('sanitizes nested object string fields', () => {
    const input = { name: 'Max', message: '<b>Hi</b>' };
    expect(pipe.transform(input, bodyMeta)).toEqual({ name: 'Max', message: 'Hi' });
  });

  it('returns value unchanged when type is not body', () => {
    const queryMeta: ArgumentMetadata = { type: 'query', data: undefined };
    expect(pipe.transform('<script>x</script>', queryMeta)).toBe('<script>x</script>');
  });

  it('returns null/undefined unchanged', () => {
    expect(pipe.transform(null, bodyMeta)).toBeNull();
    expect(pipe.transform(undefined, bodyMeta)).toBeUndefined();
  });
});
