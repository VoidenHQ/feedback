# Changelog

## 1.0.2

### Fixed

- Empty or malformed requests in a Postman collection no longer cause the entire import to fail — they are now skipped and the remaining requests continue to import
- Each skipped request now shows an error toast with details about the failure (request name, method, URL, and error reason)

### Changed

- Improved error messages during conversion to include request name, HTTP method, and URL for easier debugging
