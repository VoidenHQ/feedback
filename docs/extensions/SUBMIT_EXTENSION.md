# Submit Your Extension

This guide explains how to submit your extension for inclusion in Voiden.

## Overview

Community-developed extensions can be submitted to the Voiden team for review. Once approved, your extension will be bundled with Voiden and available to all users.

## Prerequisites

Before submitting, ensure your extension:

- [ ] Has a valid `manifest.json` (see [Auto-Discovery](AUTO_DISCOVERY.md))
- [ ] Follows the extension structure in [How to Add Extension](HOW_TO_ADD.md)
- [ ] Works with the latest version of Voiden
- [ ] Has been tested locally

## Submission Process

### 1. Develop Your Extension

Create your extension following the [How to Add Extension](HOW_TO_ADD.md) guide.

### 2. Test Locally

Add your extension to `core-extensions/src/` and verify it works:

```bash
# Build core extensions
yarn workspace @voiden/core-extensions build

# Start the app
cd apps/electron && yarn start
```

### 3. Create a Pull Request

1. Fork the [Voiden repository](https://github.com/VoidenHQ/voiden)
2. Add your extension to `core-extensions/src/`
3. Submit a pull request with:
   - Clear description of what your extension does
   - Screenshots or GIFs demonstrating functionality
   - Any dependencies or requirements

### 4. Review Process

The Voiden team will review your extension against the checklist below. We may request changes or ask questions during the review.

### 5. Approval & Release

Once approved, your extension will be merged and included in the next Voiden release.

## Review Checklist

Your extension will be evaluated on:

### Required

- [ ] **Functionality** - Extension works as described
- [ ] **No breaking changes** - Doesn't break existing functionality
- [ ] **Valid manifest** - All required fields present
- [ ] **Clean code** - Follows project coding standards
- [ ] **No security issues** - No vulnerabilities or malicious code

### Recommended

- [ ] **Documentation** - Clear description in manifest readme
- [ ] **Error handling** - Graceful handling of edge cases
- [ ] **Performance** - No significant performance impact
- [ ] **Accessibility** - UI components are accessible

## Extension Guidelines

### Do

- Follow existing extension patterns
- Use the SDK APIs provided
- Handle errors gracefully
- Keep the extension focused on one purpose
- Write clear manifest descriptions

### Don't

- Include external network calls without clear purpose
- Bundle large dependencies unnecessarily
- Modify core functionality in unexpected ways
- Include tracking or analytics
- Store sensitive data insecurely

## Getting Help

- Review existing extensions in `core-extensions/src/` for examples
- Check the [SDK documentation](https://github.com/VoidenHQ/sdk)
- Open an issue for questions before submitting

## Contact

For questions about the submission process:
- Open a [GitHub Issue](https://github.com/VoidenHQ/voiden/issues)
- Tag your issue with `extension-submission`
