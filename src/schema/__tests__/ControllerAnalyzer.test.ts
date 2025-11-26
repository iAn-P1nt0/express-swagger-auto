/**
 * Tests for ControllerAnalyzer
 */

import { describe, it, expect } from 'vitest';
import { ControllerAnalyzer } from '../ControllerAnalyzer';

describe('ControllerAnalyzer', () => {
  const analyzer = new ControllerAnalyzer();

  describe('isAsync', () => {
    it('should detect async function', () => {
      const code = 'async (req, res) => { await db.query(); }';
      expect(analyzer.isAsync(code)).toBe(true);
    });

    it('should detect async function declaration', () => {
      const code = 'async function handler(req, res) {}';
      expect(analyzer.isAsync(code)).toBe(true);
    });

    it('should detect await keyword', () => {
      const code = 'const result = await fetch(url);';
      expect(analyzer.isAsync(code)).toBe(true);
    });

    it('should return false for sync code', () => {
      const code = '(req, res) => { res.json({}); }';
      expect(analyzer.isAsync(code)).toBe(false);
    });
  });

  describe('queriesDatabase', () => {
    it('should detect .find() calls', () => {
      const code = 'const user = await User.find({ email });';
      expect(analyzer.queriesDatabase(code)).toBe(true);
    });

    it('should detect .query() calls', () => {
      const code = 'const result = db.query("SELECT * FROM users");';
      expect(analyzer.queriesDatabase(code)).toBe(true);
    });

    it('should detect db. references', () => {
      const code = 'db.connection.query(...)';
      expect(analyzer.queriesDatabase(code)).toBe(true);
    });

    it('should return false for non-database code', () => {
      const code = '(req, res) => { res.json(data); }';
      expect(analyzer.queriesDatabase(code)).toBe(false);
    });
  });

  describe('analyzeController', () => {
    it('should extract request body schema from destructured parameters', () => {
      const code = `
        (req, res) => {
          const { email, password } = req.body;
          if (!email || !password) {
            return res.status(400).send('Missing fields');
          }
          res.json({ success: true });
        }
      `;

      const schema = analyzer.analyzeController(code);

      expect(schema.requestBody).toBeDefined();
      expect(schema.requestBody?.type).toBe('object');
    });

    it('should extract response status codes', () => {
      const code = `
        (req, res) => {
          if (!req.body.email) {
            return res.status(400).send('Email required');
          }
          res.status(200).json({ success: true });
        }
      `;

      const schema = analyzer.analyzeController(code);

      expect(schema.responses).toBeDefined();
      expect(schema.responses?.['200']).toBeDefined();
      expect(schema.responses?.['400']).toBeDefined();
    });

    it('should detect error responses', () => {
      const code = `
        async (req, res) => {
          try {
            const user = await User.findById(req.params.id);
            if (!user) {
              return res.status(404).json({ error: 'Not found' });
            }
            res.json(user);
          } catch (error) {
            res.status(500).send('Internal error');
          }
        }
      `;

      const schema = analyzer.analyzeController(code);

      expect(schema.responses?.['404']).toBeDefined();
      expect(schema.responses?.['500']).toBeDefined();
    });
  });

  describe('extractJsDocSchema', () => {
    it('should parse @param annotations', () => {
      const jsDoc = `
        /**
         * Create a new user
         * @param {object} req - Express request
         * @param {string} req.body.email - User email
         * @param {string} req.body.password - User password
         * @returns {object} Created user
         */
      `;

      const schema = analyzer.extractJsDocSchema(jsDoc);

      expect(schema.requestBody).toBeDefined();
      expect(schema.responses?.['200']).toBeDefined();
    });

    it('should extract @returns description', () => {
      const jsDoc = `
        /**
         * @returns {object} User data with profile information
         */
      `;

      const schema = analyzer.extractJsDocSchema(jsDoc);

      expect(schema.responses?.['200']?.description).toContain('User data');
    });
  });

  describe('extractErrorHandling', () => {
    it('should find res.status() patterns with status codes', () => {
      const code = `
        if (error) {
          res.status(400).send('Validation failed');
        }
        res.status(500).json({ error: 'Internal error' });
      `;

      const errors = analyzer.extractErrorHandling(code);

      expect(errors.length).toBeGreaterThan(0);
      const codes = errors.map(e => e.statusCode);
      expect(codes).toContain(400);
      expect(codes).toContain(500);
    });

    it('should handle multiple error patterns', () => {
      const code = `
        res.status(400).send('Bad request');
        res.status(401).send('Unauthorized');
        res.status(403).send('Forbidden');
        res.status(404).json({ message: 'Not found' });
      `;

      const errors = analyzer.extractErrorHandling(code);

      expect(errors.length).toBeGreaterThanOrEqual(4);
    });
  });
});
