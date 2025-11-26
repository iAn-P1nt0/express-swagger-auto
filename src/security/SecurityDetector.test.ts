import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityDetector, detectSecurity } from './SecurityDetector';

describe('SecurityDetector', () => {
  let detector: SecurityDetector;

  beforeEach(() => {
    detector = new SecurityDetector();
  });

  describe('detectFromMiddleware', () => {
    it('should detect JWT/Bearer authentication', () => {
      const middleware = [
        { name: 'verifyJWT' },
        { name: 'verifyBearerToken' },
      ];

      const detected = detector.detectFromMiddleware(middleware);
      expect(detected.has('bearerAuth')).toBe(true);
      expect(detected.get('bearerAuth')?.scheme).toBe('bearer');
      expect(detected.get('bearerAuth')?.bearerFormat).toBe('JWT');
    });

    it('should detect API Key authentication', () => {
      const middleware = [
        { name: 'verifyAPIKey' },
        { name: 'checkApiKey' },
      ];

      const detected = detector.detectFromMiddleware(middleware);
      expect(detected.has('apiKeyAuth')).toBe(true);
      expect(detected.get('apiKeyAuth')?.type).toBe('apiKey');
    });

    it('should detect OAuth2', () => {
      const middleware = [
        { name: 'oAuth2Handler' },
        { name: 'verifyOAuth' },
      ];

      const detected = detector.detectFromMiddleware(middleware);
      expect(detected.has('oauth2')).toBe(true);
      expect(detected.get('oauth2')?.type).toBe('oauth2');
    });

    it('should detect Basic authentication', () => {
      const middleware = [
        { name: 'basicAuthMiddleware' },
        { name: 'checkBasicAuth' },
      ];

      const detected = detector.detectFromMiddleware(middleware);
      expect(detected.has('basicAuth')).toBe(true);
      expect(detected.get('basicAuth')?.scheme).toBe('basic');
    });

    it('should handle empty middleware array', () => {
      const detected = detector.detectFromMiddleware([]);
      expect(detected.size).toBe(0);
    });

    it('should ignore null/undefined middleware', () => {
      const middleware = [null, { name: 'verifyJWT' }, undefined];
      const detected = detector.detectFromMiddleware(middleware as any);
      expect(detected.has('bearerAuth')).toBe(true);
    });
  });

  describe('detectFromMetadata', () => {
    it('should detect security from string metadata', () => {
      const metadata = { security: 'bearer' };
      const detected = detector.detectFromMetadata(metadata);
      expect(detected.has('bearerAuth')).toBe(true);
    });

    it('should detect security from array metadata', () => {
      const metadata = {
        security: [
          { type: 'http', scheme: 'bearer' },
          { type: 'apiKey', in: 'header' },
        ],
      };
      const detected = detector.detectFromMetadata(metadata);
      expect(detected.size).toBeGreaterThan(0);
    });

    it('should detect security from authentication parameters', () => {
      const metadata = {
        parameters: [
          { name: 'Authorization', in: 'header', description: 'Bearer token' },
        ],
      };
      const detected = detector.detectFromMetadata(metadata);
      expect(detected.has('bearerAuth')).toBe(true);
    });

    it('should handle missing metadata', () => {
      const detected = detector.detectFromMetadata(null);
      expect(detected.size).toBe(0);
    });

    it('should handle metadata without security field', () => {
      const metadata = { parameters: [] };
      const detected = detector.detectFromMetadata(metadata);
      expect(detected.size).toBe(0);
    });
  });

  describe('detectFromHeaders', () => {
    it('should detect Bearer token from Authorization header', () => {
      const detected = detector.detectFromHeaders(['Authorization']);
      expect(detected.has('bearerAuth')).toBe(true);
    });

    it('should detect API Key from standard headers', () => {
      const detected = detector.detectFromHeaders(['X-API-Key']);
      expect(detected.has('apiKeyAuth')).toBe(true);
    });

    it('should detect API Key from api-key header', () => {
      const detected = detector.detectFromHeaders(['api-key']);
      expect(detected.has('apiKeyAuth')).toBe(true);
    });

    it('should detect token from headers containing token', () => {
      const detected = detector.detectFromHeaders(['X-Auth-Token']);
      expect(detected.has('tokenAuth')).toBe(true);
    });

    it('should handle multiple headers', () => {
      const detected = detector.detectFromHeaders([
        'Authorization',
        'X-API-Key',
        'Content-Type',
      ]);
      expect(detected.has('bearerAuth')).toBe(true);
      expect(detected.has('apiKeyAuth')).toBe(true);
      expect(detected.size).toBe(2);
    });

    it('should handle empty headers array', () => {
      const detected = detector.detectFromHeaders([]);
      expect(detected.size).toBe(0);
    });
  });

  describe('detect (comprehensive)', () => {
    it('should detect from all sources', () => {
      const detected = detector.detect(
        [{ name: 'verifyJWT' }],
        { security: 'api-key' },
        ['Authorization', 'X-API-Key']
      );

      expect(detected.has('bearerAuth')).toBe(true);
      expect(detected.has('apiKeyAuth')).toBe(true);
    });

    it('should merge detections without duplicates', () => {
      const detected = detector.detect(
        [{ name: 'verifyJWT' }],
        { security: 'bearer' },
        ['Authorization']
      );

      // Should only have one bearerAuth entry
      expect(detected.get('bearerAuth')?.scheme).toBe('bearer');
    });

    it('should handle partial detection', () => {
      const detected = detector.detect(
        [{ name: 'verifyJWT' }],
        undefined,
        undefined
      );

      expect(detected.has('bearerAuth')).toBe(true);
      expect(detected.size).toBe(1);
    });
  });

  describe('getDetected and clear', () => {
    it('should return copy of detected schemes', () => {
      detector.detect([{ name: 'verifyJWT' }]);
      const schemes = detector.getDetected();
      expect(schemes instanceof Map).toBe(true);
    });

    it('should clear all detected schemes', () => {
      detector.detect([{ name: 'verifyJWT' }]);
      detector.clear();
      const schemes = detector.getDetected();
      expect(schemes.size).toBe(0);
    });
  });
});

describe('detectSecurity (utility function)', () => {
  it('should detect security and return object', () => {
    const schemes = detectSecurity(
      [{ name: 'verifyJWT' }],
      undefined,
      ['Authorization']
    );

    expect(schemes.bearerAuth).toBeDefined();
    expect(schemes.bearerAuth.scheme).toBe('bearer');
  });

  it('should handle empty detection', () => {
    const schemes = detectSecurity();
    expect(Object.keys(schemes).length).toBe(0);
  });

  it('should return proper OpenAPISecurityScheme format', () => {
    const schemes = detectSecurity(
      [{ name: 'verifyAPIKey' }],
      undefined,
      []
    );

    const apiKeyScheme = schemes.apiKeyAuth;
    expect(apiKeyScheme.type).toBe('apiKey');
    expect(apiKeyScheme.in).toBe('header');
    expect(apiKeyScheme.name).toBe('X-API-Key');
  });
});
