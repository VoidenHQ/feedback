# Changelog

## 1.0.1

### Fixed

- Code blocks no longer overflow their container; long lines now wrap to the next line instead of scrolling horizontally
- Paragraph (`<p>`) text now wraps properly with `word-break` and `overflow-wrap`, preventing content from going out of bounds
- Added vertical margin and padding to paragraphs for better spacing
- Resolved TypeScript error where `inline` prop was not recognized on the `code` component type from `react-markdown`
- Blockquotes (`>`) now render with visible styling (left border, background, padding) matching the editor theme

### Changed

- `<pre>` elements now use `white-space: pre-wrap` and `overflow-x: hidden` instead of `overflow-x: auto`
- `<code>` block elements now use `white-space: pre-wrap` for line wrapping
- Inline code detection now derived from the absence of a `className` (language tag) rather than a removed `inline` prop
