import { faker } from '@faker-js/faker';

export interface FakerFunction {
  path: string;           // e.g., "person.firstName"
  description: string;    // e.g., "Generate a random first name"
  example: string;        // e.g., "John"
  category: string;       // e.g., "Person"
}

/**
 * Registry of all available Faker functions
 */
export const FAKER_FUNCTIONS: FakerFunction[] = [
  // Names
  { path: 'person.firstName', description: 'Random first name', example: 'John', category: 'Person' },
  { path: 'person.lastName', description: 'Random last name', example: 'Doe', category: 'Person' },
  { path: 'person.fullName', description: 'Random full name', example: 'John Doe', category: 'Person' },
  { path: 'person.middleName', description: 'Random middle name', example: 'James', category: 'Person' },
  { path: 'person.prefix', description: 'Name prefix', example: 'Mr.', category: 'Person' },
  { path: 'person.suffix', description: 'Name suffix', example: 'Jr.', category: 'Person' },

  // Internet
  { path: 'internet.email', description: 'Random email address', example: 'john@example.com', category: 'Internet' },
  { path: 'internet.userName', description: 'Random username', example: 'john_doe', category: 'Internet' },
  { path: 'internet.password', description: 'Random password', example: 'aB3$xY9!', category: 'Internet' },
  { path: 'internet.url', description: 'Random URL', example: 'https://example.com', category: 'Internet' },
  { path: 'internet.domainName', description: 'Random domain', example: 'example.com', category: 'Internet' },
  { path: 'internet.ipv4', description: 'Random IPv4 address', example: '192.168.1.1', category: 'Internet' },
  { path: 'internet.ipv6', description: 'Random IPv6 address', example: '2001:0db8::1', category: 'Internet' },
  { path: 'internet.mac', description: 'Random MAC address', example: '00:1B:44:11:3A:B7', category: 'Internet' },

  // Phone
  { path: 'phone.number', description: 'Random phone number', example: '+1-555-1234', category: 'Phone' },

  // Address
  { path: 'location.city', description: 'Random city name', example: 'New York', category: 'Location' },
  { path: 'location.country', description: 'Random country', example: 'United States', category: 'Location' },
  { path: 'location.zipCode', description: 'Random ZIP code', example: '10001', category: 'Location' },
  { path: 'location.streetAddress', description: 'Random street address', example: '123 Main St', category: 'Location' },
  { path: 'location.state', description: 'Random state', example: 'California', category: 'Location' },
  { path: 'location.latitude', description: 'Random latitude', example: '37.7749', category: 'Location' },
  { path: 'location.longitude', description: 'Random longitude', example: '-122.4194', category: 'Location' },

  // Data types
  { path: 'string.uuid', description: 'Random UUID', example: 'a1b2c3d4-e5f6-7890...', category: 'Data' },
  { path: 'number.int', description: 'Random integer', example: '42', category: 'Data' },
  { path: 'number.float', description: 'Random float', example: '3.14', category: 'Data' },
  { path: 'datatype.boolean', description: 'Random boolean', example: 'true', category: 'Data' },
  { path: 'date.past', description: 'Random past date', example: '2023-01-15T10:30:00Z', category: 'Date' },
  { path: 'date.future', description: 'Random future date', example: '2025-12-31T23:59:59Z', category: 'Date' },
  { path: 'date.recent', description: 'Random recent date', example: '2024-10-28T15:30:00Z', category: 'Date' },

  // Lorem
  { path: 'lorem.word', description: 'Random word', example: 'ipsum', category: 'Lorem' },
  { path: 'lorem.words', description: 'Random words', example: 'lorem ipsum dolor', category: 'Lorem' },
  { path: 'lorem.sentence', description: 'Random sentence', example: 'Lorem ipsum dolor sit.', category: 'Lorem' },
  { path: 'lorem.paragraph', description: 'Random paragraph', example: 'Lorem ipsum...', category: 'Lorem' },
  { path: 'lorem.text', description: 'Random text', example: 'Lorem ipsum dolor...', category: 'Lorem' },

  // Company
  { path: 'company.name', description: 'Random company name', example: 'Acme Corp', category: 'Company' },
  { path: 'company.catchPhrase', description: 'Random catch phrase', example: 'Innovative solutions', category: 'Company' },

  // Commerce
  { path: 'commerce.product', description: 'Random product name', example: 'Laptop', category: 'Commerce' },
  { path: 'commerce.productName', description: 'Random product name', example: 'Ergonomic Chair', category: 'Commerce' },
  { path: 'commerce.price', description: 'Random price', example: '99.99', category: 'Commerce' },
  { path: 'commerce.department', description: 'Random department', example: 'Electronics', category: 'Commerce' },

  // Finance
  { path: 'finance.accountNumber', description: 'Random account number', example: '12345678', category: 'Finance' },
  { path: 'finance.amount', description: 'Random amount', example: '1234.56', category: 'Finance' },
  { path: 'finance.creditCardNumber', description: 'Random credit card', example: '4111-1111-1111-1111', category: 'Finance' },
  { path: 'finance.currencyCode', description: 'Random currency code', example: 'USD', category: 'Finance' },

  // Image
  { path: 'image.url', description: 'Random image URL', example: 'https://loremflickr.com/640/480', category: 'Image' },
  { path: 'image.avatar', description: 'Random avatar URL', example: 'https://avatars.githubusercontent.com/u/12345', category: 'Image' },
];

/**
 * Execute a faker function by path
 * @param path - Dot notation path (e.g., "person.firstName")
 * @returns Generated fake data
 */
export function executeFakerFunction(path: string): string {
  try {
    // Split path and traverse faker object
    const parts = path.split('.');
    let current: any = faker;

    for (const part of parts) {
      if (!current[part]) {
        throw new Error(`Faker function not found: ${path}`);
      }
      current = current[part];
    }

    // Execute if it's a function
    if (typeof current === 'function') {
      const result = current();
      return String(result);
    }

    throw new Error(`${path} is not a function`);
  } catch (error) {
    return `{{$faker.${path}()}}`;  // Return original if fails
  }
}

/**
 * Replace all faker variables in text
 * Pattern: {{$faker.path.to.function()}}
 */
export function replaceFakerVariables(text: string): string {
  if (!text) return text;

  // Match {{$faker.XXX()}} pattern
  const pattern = /\{\{\$faker\.([a-zA-Z.]+)\(\)\}\}/g;

  return text.replace(pattern, (_match, path) => {
    return executeFakerFunction(path);
  });
}
