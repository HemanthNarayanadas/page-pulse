import { validateAuditUrl } from '../src/validators/urlValidator';
import { InvalidUrlError, PrivateAddressError } from '../src/utils/errors';

describe('validateAuditUrl', () => {
  it('accepts a well-formed https URL', () => {
    const result = validateAuditUrl('https://example.com');
    expect(result.hostname).toBe('example.com');
  });

  it('rejects an empty string', () => {
    expect(() => validateAuditUrl('')).toThrow(InvalidUrlError);
  });

  it('rejects a missing value', () => {
    expect(() => validateAuditUrl(undefined)).toThrow(InvalidUrlError);
  });

  it('rejects malformed URLs', () => {
    expect(() => validateAuditUrl('not-a-url')).toThrow(InvalidUrlError);
  });

  it('rejects non-http protocols', () => {
    expect(() => validateAuditUrl('ftp://example.com')).toThrow(InvalidUrlError);
    expect(() => validateAuditUrl('file:///etc/passwd')).toThrow(InvalidUrlError);
  });

  it('rejects localhost', () => {
    expect(() => validateAuditUrl('http://localhost:3000')).toThrow(PrivateAddressError);
  });

  it('rejects private IPv4 addresses', () => {
    expect(() => validateAuditUrl('http://127.0.0.1')).toThrow(PrivateAddressError);
    expect(() => validateAuditUrl('http://192.168.1.10')).toThrow(PrivateAddressError);
    expect(() => validateAuditUrl('http://10.0.0.5')).toThrow(PrivateAddressError);
    expect(() => validateAuditUrl('http://169.254.169.254')).toThrow(PrivateAddressError);
  });

  it('rejects .internal and .local hostnames', () => {
    expect(() => validateAuditUrl('http://metadata.internal')).toThrow(PrivateAddressError);
    expect(() => validateAuditUrl('http://myhost.local')).toThrow(PrivateAddressError);
  });
});
