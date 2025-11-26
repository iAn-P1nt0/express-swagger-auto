# Security Policy

## Reporting a Vulnerability

If you believe you've discovered a security vulnerability in express-swagger-auto, please **do not** open a public GitHub issue. Instead, please report it privately so we can work on a fix before the vulnerability is disclosed publicly.

### How to Report

1. **Email**: Send details to the maintainers (create a GitHub issue with `[SECURITY]` prefix to get contact information)
2. **GitHub Security Advisory**: Use [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/privately-reporting-a-security-vulnerability)
3. **Include in your report**:
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)
   - Your contact information

### Response Timeline

- **Initial response**: Within 48 hours
- **Update frequency**: At least every 5 days during active development
- **Public disclosure**: Coordinated between maintainers and reporter, typically 30-90 days after initial report

## Supported Versions

| Version | Status | Support Until |
|---------|--------|----------------|
| 0.1.x   | Latest | Current + 12 months |
| < 0.1   | Unsupported | - |

Security updates are released for supported versions only.

## Known Vulnerabilities

None currently reported.

## Security Considerations for Users

### Runtime Capture Safety

The `runtime-capture` feature in express-swagger-auto can intercept request/response data. **Use with caution in production:**

- **Enabled by default**: Runtime capture is **disabled by default**
- **Sensitive data**: Never enable in production with sensitive endpoints
- **Field masking**: If enabled, passwords, tokens, and API keys are automatically masked
- **Recommendation**: Only use during development with trusted Express apps

Example safe configuration:
```typescript
import { expressSwaggerAuto } from 'express-swagger-auto';

const config = {
  // ✅ Runtime capture disabled for production
  runtimeCapture: process.env.NODE_ENV !== 'production',
};
```

### Dependency Management

We maintain security by:

- Regularly updating dependencies with `pnpm up --latest`
- Using [Dependabot](https://dependabot.com/) for automated vulnerability scanning
- Monitoring the [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) report
- Running security audits during CI/CD on every PR

### Authentication & Authorization Detection

The security detector automatically identifies JWT, API Key, OAuth2, and Basic Auth patterns. However:

- **Not guaranteed**: Detection is pattern-based and may have false positives/negatives
- **Manual review**: Always manually verify the detected schemes match your actual security implementation
- **Don't rely solely**: Use the generated OpenAPI spec as a starting point, not a definitive security audit

### Spec Output Safety

When generating OpenAPI specs:

- **No credentials in spec**: API keys, tokens, and passwords are never included in generated specs
- **Sanitization**: Field names matching common secrets patterns are masked
- **Review before sharing**: Always review generated specs before sharing publicly

Example of automatic sanitization:
```typescript
// Original field
{ password: "secret123", apiKey: "abc123", username: "user" }

// Generated in spec (sensitive fields masked)
{ password: "***MASKED***", apiKey: "***MASKED***", username: "user" }
```

## Best Practices

### Development Workflow

1. **Use `.gitignore`**: Never commit `.env` files or secrets
   ```bash
   echo ".env*" >> .gitignore
   ```

2. **Environment variables**: Store sensitive config in environment variables
   ```typescript
   const apiKey = process.env.API_KEY; // Don't hardcode
   ```

3. **Review generated specs**: Before committing `openapi.json`, verify no secrets are included

### Production Deployment

1. **Disable runtime capture**: Set `runtimeCapture: false` in production
2. **Use spec caching**: Cache generated specs to minimize runtime generation
3. **Restrict access**: Limit who can view `/api-docs` and `/openapi.json` endpoints
4. **Use authentication**: Protect Swagger UI behind auth if containing sensitive operations

Example:
```typescript
import { swaggerUI } from 'express-swagger-auto/middleware';

// Protect Swagger UI with auth
app.use('/api-docs', authenticateUser, swaggerUI());
```

### Version Pinning

While we follow semantic versioning, it's recommended to pin minor versions in production:

```json
{
  "dependencies": {
    "express-swagger-auto": "~0.1.0"
  }
}
```

## Vulnerability Disclosure Process

1. **Report received**: Acknowledge receipt within 24 hours
2. **Assessment**: Evaluate severity and impact
3. **Fix development**: Create and test security patch
4. **Pre-release notification**: Notify key integrators before public release
5. **Public release**: Release patched version with security advisory
6. **Documentation**: Update this policy with details if appropriate

## Advisory Severity Levels

- **Critical**: Remote code execution, authentication bypass, or data exposure affecting all users
- **High**: Authentication bypass or data exposure affecting specific configurations
- **Medium**: Denial of service or partial information disclosure
- **Low**: Potential security issue with minimal practical impact

## Acknowledgments

We appreciate the security research community and will acknowledge vulnerability reporters in release notes (with permission).

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)

## Questions?

For security-related questions that aren't vulnerability reports, you can:

1. Open a discussion in [GitHub Discussions](https://github.com/iAn-P1nt0/express-swagger-auto/discussions)
2. Check `docs/SECURITY.md` for detailed security guidance
3. Review example apps for secure configurations
