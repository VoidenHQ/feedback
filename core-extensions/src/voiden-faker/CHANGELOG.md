# Voiden Faker Changelog

## v1.1.0 — 12/02/2026

### Added
- Added support for faker function arguments in template expressions
- You can now use values like `{{$faker.number.int({ min: 1, max: 10 })}}` and other argument-based faker calls

### Changed
- Updated Voiden Faker extension version from `1.0.0` to `1.1.0`
- Faker dropdown selection now inserts complete expression syntax by default
- Faker suggestion dropdown now uses standard app suggestion colors/styles
- Faker suggestion dropdown now shows all matching supported faker functions (removed previous cap)
- Normal autocomplete selection now inserts full function syntax: `{{$faker.path()}}`
- Added parameter template inserts for supported faker functions:
  - In rich text suggestions, use `Ctrl+Enter` to insert with parameter template
  - In code autocomplete, select the `(params)` variant to insert with template
- Added styled hover docs on completed faker variables (`{{$faker...}}`) showing params and examples
- Updated faker parameter docs to align with official Faker API documentation
