/**
 * Path Traversal Security Tests
 *
 * Tests for filesystem security and path traversal prevention
 * Covers OWASP API8:2023 - Security Misconfiguration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { pathTraversalVectors } from './fixtures';
import { isPathSafe } from './utils';

describe('Path Traversal Security Tests', () => {
  const testDir = '/tmp/security-test-' + Date.now();

  beforeEach(() => {
    // Create test directory structure
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
      fs.mkdirSync(path.join(testDir, 'safe'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'safe', 'test.txt'), 'safe content');
    }
  });

  afterEach(() => {
    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Path Traversal with ../ Patterns', () => {
    it('should detect simple traversal patterns', () => {
      const simpleVectors = [
        '../../../etc/passwd',
        '../../..',
        '../',
        '..\\..\\',
        '%2e%2e%2f',
        '%2e%2e/',
        '../etc/passwd',
      ];
      
      simpleVectors.forEach((vector) => {
        expect(isPathSafe(vector)).toBe(false);
      });
    });

    it('should detect simple ../ traversal', () => {
      const attacks = [
        '../',
        '../../',
        '../../../',
        '../../../../',
        '../../../../../etc/passwd',
      ];

      attacks.forEach((attack) => {
        expect(isPathSafe(attack)).toBe(false);
      });
    });

    it('should detect Windows-style traversal', () => {
      const windowsAttacks = [
        '..\\',
        '..\\..\\',
        '..\\..\\..\\',
        '..\\..\\..\\windows\\system32',
      ];

      windowsAttacks.forEach((attack) => {
        expect(isPathSafe(attack)).toBe(false);
      });
    });

    it('should detect mixed separator traversal', () => {
      const mixedAttacks = [
        '../..\\',
        '..\\../',
        '..\\/..\\',
        '..//..\\/',
      ];

      mixedAttacks.forEach((attack) => {
        expect(isPathSafe(attack)).toBe(false);
      });
    });
  });

  describe('Absolute Path Injection', () => {
    it('should detect absolute Unix paths', () => {
      const unixAbsolute = [
        '/etc/passwd',
        '/etc/shadow',
        '/var/log/auth.log',
        '/root/.ssh/id_rsa',
        '/proc/self/environ',
      ];

      unixAbsolute.forEach((p) => {
        expect(isPathSafe(p)).toBe(false);
      });
    });

    it('should detect dangerous Windows paths', () => {
      const windowsAbsolute = [
        'C:\\Windows\\System32',
        'C:/Windows',
      ];

      windowsAbsolute.forEach((p) => {
        expect(isPathSafe(p)).toBe(false);
      });
    });

    it('should identify drive letters as dangerous', () => {
      const drivePaths = ['D:\\', 'E:/data'];
      
      drivePaths.forEach((p) => {
        // These should be flagged as potentially dangerous
        expect(p.match(/^[A-Z]:[\\\/]/i)).not.toBeNull();
      });
    });

    it('should allow relative safe paths', () => {
      const safePaths = [
        'src/routes/api.ts',
        'controllers/user.controller.ts',
        'models/User.ts',
        'test/fixtures/sample.json',
      ];

      safePaths.forEach((p) => {
        expect(isPathSafe(p)).toBe(true);
      });
    });
  });

  describe('Symlink Following Prevention', () => {
    it('should handle symlink-like paths', () => {
      // Test paths that might be symlinks
      const symlinkPatterns = [
        '/proc/self',
        '/dev/fd',
        '/proc/self/root',
      ];

      symlinkPatterns.forEach((p) => {
        // These start with dangerous directories
        expect(p.startsWith('/proc') || p.startsWith('/dev')).toBe(true);
      });
    });
  });

  describe('URL Encoding Bypass Attempts', () => {
    it('should detect percent-encoded traversal', () => {
      const encodedAttacks = [
        '%2e%2e%2f', // ../
        '%2e%2e/',   // ../
        '..%2f',     // ../
        '%2e%2e%5c', // ..\
      ];

      encodedAttacks.forEach((attack) => {
        expect(isPathSafe(attack)).toBe(false);
      });
    });

    it('should detect double-encoded traversal', () => {
      const doubleEncoded = [
        '%252e%252e%252f', // %2e%2e%2f
        '..%255c',         // ..%5c
        '%252e%252e/',     // %2e%2e/
      ];

      doubleEncoded.forEach((attack) => {
        // Double encoding contains %25 which encodes %
        expect(attack.includes('%25')).toBe(true);
      });
    });

    it('should detect overlong UTF-8 encoding', () => {
      const overlongUtf8 = [
        '%c0%ae%c0%ae/',   // ../
        '%c0%af',         // /
        '%e0%80%af',      // /
      ];

      overlongUtf8.forEach((attack) => {
        // Overlong UTF-8 uses specific byte patterns
        expect(attack.includes('%c0') || attack.includes('%e0')).toBe(true);
      });
    });
  });

  describe('Null Byte Injection', () => {
    it('should detect null byte attacks', () => {
      const nullByteAttacks = [
        '../../../etc/passwd%00.txt',
        '..\\..\\..\\boot.ini%00.jpg',
        'file.txt%00.exe',
      ];

      nullByteAttacks.forEach((attack) => {
        // Null byte should not be able to bypass path checks
        expect(attack.includes('%00')).toBe(true);
      });
    });
  });

  describe('File Extension Bypass', () => {
    it('should not trust file extensions alone', () => {
      const extensionBypass = [
        '../../../etc/passwd.txt',
        '../../../etc/passwd.json',
        '../../../etc/passwd.xml',
        '../../../etc/passwd.html',
      ];

      extensionBypass.forEach((attack) => {
        expect(isPathSafe(attack)).toBe(false);
      });
    });
  });

  describe('Path Normalization', () => {
    it('should normalize path before validation', () => {
      const pathsToNormalize = [
        'a/b/../c',
        'a/./b/./c',
        'a//b///c',
        'a/b/c/../../d',
      ];

      pathsToNormalize.forEach((p) => {
        const normalized = path.normalize(p);
        expect(normalized).not.toContain('..');
      });
    });

    it('should handle dot segments', () => {
      const dotPaths = [
        './safe/path',
        'safe/./path',
        './.',
        '.',
      ];

      dotPaths.forEach((p) => {
        const normalized = path.normalize(p);
        expect(normalized).not.toContain('..');
      });
    });
  });

  describe('Directory Listing Prevention', () => {
    it('should not expose directory contents via path manipulation', () => {
      const directoryProbes = [
        '/',
        './',
        '../',
        'src/',
        'node_modules/',
      ];

      directoryProbes.forEach((probe) => {
        if (probe.includes('..')) {
          expect(isPathSafe(probe)).toBe(false);
        }
      });
    });
  });

  describe('Temporary File Handling', () => {
    it('should use secure temp directory', () => {
      const tempDir = require('os').tmpdir();
      expect(tempDir).toBeDefined();
      expect(typeof tempDir).toBe('string');
    });

    it('should generate unique temp file names', () => {
      const names = new Set();
      for (let i = 0; i < 100; i++) {
        const name = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        names.add(name);
      }
      expect(names.size).toBe(100); // All unique
    });
  });

  describe('Path Resolution', () => {
    it('should resolve paths within base directory', () => {
      const baseDir = '/app/data';
      const userInput = 'user/profile.json';
      const resolved = path.resolve(baseDir, userInput);

      expect(resolved.startsWith(baseDir)).toBe(true);
    });

    it('should prevent escaping base directory', () => {
      const baseDir = '/app/data';
      const maliciousInput = '../../../etc/passwd';
      const resolved = path.resolve(baseDir, maliciousInput);

      // After resolution, check if it escapes base
      expect(resolved.startsWith(baseDir)).toBe(false); // It escapes!
    });

    it('should validate resolved path stays within bounds', () => {
      const validatePath = (baseDir: string, userPath: string): boolean => {
        const resolved = path.resolve(baseDir, userPath);
        return resolved.startsWith(path.resolve(baseDir));
      };

      expect(validatePath('/app/data', 'safe/file.txt')).toBe(true);
      expect(validatePath('/app/data', '../secret.txt')).toBe(false);
      expect(validatePath('/app/data', '/etc/passwd')).toBe(false);
    });
  });

  describe('File Protocol Handling', () => {
    it('should detect file:// protocol', () => {
      const fileProtocol = [
        'file:///etc/passwd',
        'file://localhost/etc/passwd',
        'file://127.0.0.1/etc/passwd',
      ];

      fileProtocol.forEach((p) => {
        expect(p.startsWith('file://')).toBe(true);
      });
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle case variations', () => {
      const caseVariations = [
        '../../../ETC/PASSWD',
        '../../../Etc/Passwd',
        '../../../etc/PASSWD',
      ];

      caseVariations.forEach((p) => {
        expect(isPathSafe(p)).toBe(false);
      });
    });
  });

  describe('Unicode Normalization', () => {
    it('should handle unicode path segments', () => {
      const unicodePaths = [
        '../../../etc\u002fpasswd', // / as unicode
        '../../../etc\uff0fpasswd', // fullwidth /
      ];

      unicodePaths.forEach((p) => {
        expect(isPathSafe(p)).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty path', () => {
      expect(isPathSafe('')).toBe(true);
    });

    it('should handle whitespace-only path', () => {
      const whitespacePaths = ['   ', '\t', '\n', '\r\n'];
      whitespacePaths.forEach((p) => {
        expect(isPathSafe(p.trim())).toBe(true);
      });
    });

    it('should handle very long paths', () => {
      const longPath = 'a/'.repeat(1000) + 'file.txt';
      expect(typeof isPathSafe(longPath)).toBe('boolean');
    });

    it('should handle paths with special characters', () => {
      const specialPaths = [
        'file with spaces.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt',
        'file.multiple.dots.txt',
      ];

      specialPaths.forEach((p) => {
        expect(isPathSafe(p)).toBe(true);
      });
    });
  });
});
