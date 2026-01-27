# Security Policy

## Reporting a Vulnerability

The Voiden team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing:

**[security@voiden.md](mailto:security@voiden.md)**

You should receive a response within 48 hours. If for some reason you do not, please follow up to ensure we received your original message.

### What to Include

Please include the following information in your report:

- **Type of vulnerability** (e.g., XSS, code injection, insecure IPC, dependency vulnerability)
- **Full paths of source file(s)** related to the vulnerability
- **Location of the affected source code** (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the vulnerability** - what an attacker could do
- **Any potential mitigations** you've identified

### What to Expect

After submitting a vulnerability report:

1. **Acknowledgment** - We'll acknowledge receipt within 48 hours
2. **Investigation** - We'll investigate and validate the issue
3. **Updates** - We'll keep you informed of our progress
4. **Resolution** - We'll work on a fix and coordinate disclosure
5. **Credit** - We'll credit you in the security advisory (unless you prefer to remain anonymous)

### Disclosure Policy

- **Coordinated disclosure** - We ask that you give us reasonable time to fix the issue before public disclosure
- **Typical timeline** - We aim to release fixes within 90 days
- **Security advisories** - We'll publish a security advisory once a fix is released
- **Credit** - Security researchers who report valid vulnerabilities will be credited

### Security Update Process

When we release a security update:

1. We'll release a patched version
2. We'll publish a security advisory on GitHub
3. We'll update the CHANGELOG with security fixes
4. We'll notify users through appropriate channels

## Security Best Practices for Extension Developers

When building extensions with the Voiden SDK:

### Input Validation

- **Always validate user input** before processing
- **Sanitize data** before inserting into the editor
- **Use type checking** to ensure data integrity

### IPC Security (Electron Extensions)

- **Validate all IPC messages** from renderer processes
- **Don't trust user-provided data** in IPC handlers
- **Use context isolation** in your Electron setup
- **Validate file paths** to prevent directory traversal

Example:
```typescript
this.registerIPCHandler('process-file', async (data) => {
  // BAD - No validation
  const content = await fs.readFile(data.path);

  // GOOD - Validate and sanitize
  if (!isValidPath(data.path)) {
    throw new Error('Invalid file path');
  }
  const safePath = path.resolve(basePath, data.path);
  const content = await fs.readFile(safePath);
});
```

### File System Access

- **Validate file paths** to prevent path traversal attacks
- **Check file permissions** before reading/writing
- **Sanitize filenames** from user input
- **Use absolute paths** where possible

### Environment Variables

- **Never expose sensitive data** through environment API
- **Validate environment variable names** before access
- **Don't log sensitive values**

### Code Injection Prevention

- **Never use `eval()`** with user input
- **Sanitize HTML** before rendering
- **Use parameterized queries** if working with databases
- **Validate all dynamic imports**

### Dependencies

- **Keep dependencies updated** to get security patches
- **Review dependencies** for known vulnerabilities
- **Use `npm audit`** regularly
- **Pin dependency versions** in production

### Storage Security

- **Don't store sensitive data** in extension storage without encryption
- **Validate data** before storing and after retrieving
- **Clean up sensitive data** when no longer needed

## Known Security Considerations

### Extension Sandboxing

Extensions run with significant privileges. Users should only install extensions from trusted sources.

### Cross-Extension Communication

Extensions can communicate through the helper system. Validate all data received from other extensions.

### Editor Content

Extensions can modify editor content. Always sanitize and validate content to prevent XSS.

## Security Testing

We encourage security researchers to:

- Review the codebase for vulnerabilities
- Test the SDK and example extensions
- Report findings responsibly

## Contact

For security concerns that don't require immediate attention, you can also:

- Open a security advisory on GitHub
- Contact the maintainers directly

## Updates to This Policy

We may update this security policy from time to time. We'll notify users of significant changes through our changelog and release notes.
