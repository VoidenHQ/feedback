import { faker } from '@faker-js/faker';

export interface FakerFunction {
  path: string;           // e.g., "person.firstName"
  description: string;    // e.g., "Generate a random first name"
  example: string;        // e.g., "John"
  category: string;       // e.g., "Person"
  argsTemplate?: string;  // e.g., "{ min: 10, max: 20 }"
  paramsSummary?: string; // e.g., "min:number, max:number"
  paramsType?: string;    // e.g., "object"
  paramsCount?: number;   // e.g., 1
  sourceUrl?: string;     // e.g., "https://fakerjs.dev/api/number#int"
}

function parseFakerArgs(argsSource: string): unknown[] {
  const trimmed = argsSource.trim();
  if (!trimmed) {
    return [];
  }

  try {
    return JSON.parse(`[${trimmed}]`);
  } catch {
    // Support common faker object args like {min:10,max:20} without using eval/Function.
    const normalized = trimmed
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
      .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, content) => {
        const escaped = content.replace(/"/g, '\\"');
        return `"${escaped}"`;
      });

    return JSON.parse(`[${normalized}]`);
  }
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
  { path: 'internet.password', description: 'Random password', example: 'aB3$xY9!', category: 'Internet', argsTemplate: '{ length: 16, memorable: false }', paramsSummary: 'length:number, memorable:boolean, pattern:RegExp, prefix:string', paramsType: 'object', paramsCount: 1, sourceUrl: 'https://fakerjs.dev/api/internet#password' },
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
  { path: 'number.int', description: 'Random integer', example: '42', category: 'Data', argsTemplate: '{ min: 10, max: 20 }', paramsSummary: 'min:number, max:number, multipleOf:number', paramsType: 'object', paramsCount: 1, sourceUrl: 'https://fakerjs.dev/api/number#int' },
  { path: 'number.float', description: 'Random float', example: '3.14', category: 'Data', argsTemplate: '{ min: 1.5, max: 9.5, fractionDigits: 2 }', paramsSummary: 'min:number, max:number, fractionDigits:number, multipleOf:number', paramsType: 'object', paramsCount: 1, sourceUrl: 'https://fakerjs.dev/api/number#float' },
  { path: 'datatype.boolean', description: 'Random boolean', example: 'true', category: 'Data' },
  { path: 'date.past', description: 'Random past date', example: '2023-01-15T10:30:00Z', category: 'Date', argsTemplate: '{ years: 2 }', paramsSummary: 'years:number, refDate:string|Date|number', paramsType: 'object', paramsCount: 1, sourceUrl: 'https://fakerjs.dev/api/date#past' },
  { path: 'date.future', description: 'Random future date', example: '2025-12-31T23:59:59Z', category: 'Date', argsTemplate: '{ years: 2 }', paramsSummary: 'years:number, refDate:string|Date|number', paramsType: 'object', paramsCount: 1, sourceUrl: 'https://fakerjs.dev/api/date#future' },
  { path: 'date.recent', description: 'Random recent date', example: '2024-10-28T15:30:00Z', category: 'Date', argsTemplate: '{ days: 7 }', paramsSummary: 'days:number, refDate:string|Date|number', paramsType: 'object', paramsCount: 1, sourceUrl: 'https://fakerjs.dev/api/date#recent' },

  // Lorem
  { path: 'lorem.word', description: 'Random word', example: 'ipsum', category: 'Lorem' },
  { path: 'lorem.words', description: 'Random words', example: 'lorem ipsum dolor', category: 'Lorem', argsTemplate: '3', paramsSummary: 'wordCount:number', paramsType: 'number', paramsCount: 1, sourceUrl: 'https://fakerjs.dev/api/lorem#words' },
  { path: 'lorem.sentence', description: 'Random sentence', example: 'Lorem ipsum dolor sit.', category: 'Lorem', argsTemplate: '8', paramsSummary: 'wordCount:number OR { min:number, max:number }', paramsType: 'number | object', paramsCount: 1, sourceUrl: 'https://fakerjs.dev/api/lorem#sentence' },
  { path: 'lorem.paragraph', description: 'Random paragraph', example: 'Lorem ipsum...', category: 'Lorem', argsTemplate: '4', paramsSummary: 'sentenceCount:number OR { min:number, max:number }', paramsType: 'number | object', paramsCount: 1, sourceUrl: 'https://fakerjs.dev/api/lorem#paragraph' },
  { path: 'lorem.text', description: 'Random text', example: 'Lorem ipsum dolor...', category: 'Lorem' },

  // Company
  { path: 'company.name', description: 'Random company name', example: 'Acme Corp', category: 'Company' },
  { path: 'company.catchPhrase', description: 'Random catch phrase', example: 'Innovative solutions', category: 'Company' },

  // Commerce
  { path: 'commerce.product', description: 'Random product name', example: 'Laptop', category: 'Commerce' },
  { path: 'commerce.productName', description: 'Random product name', example: 'Ergonomic Chair', category: 'Commerce' },
  { path: 'commerce.price', description: 'Random price', example: '99.99', category: 'Commerce', argsTemplate: '{ min: 10, max: 100, dec: 2 }', paramsSummary: 'min:number|string, max:number|string, dec:number, symbol:string', paramsType: 'object', paramsCount: 1, sourceUrl: 'https://fakerjs.dev/api/commerce#price' },
  { path: 'commerce.department', description: 'Random department', example: 'Electronics', category: 'Commerce' },

  // Finance
  { path: 'finance.accountNumber', description: 'Random account number', example: '12345678', category: 'Finance' },
  { path: 'finance.amount', description: 'Random amount', example: '1234.56', category: 'Finance', argsTemplate: '{ min: 100, max: 5000, dec: 2 }', paramsSummary: 'min:number, max:number, dec:number, symbol:string, autoFormat:boolean', paramsType: 'object', paramsCount: 1, sourceUrl: 'https://fakerjs.dev/api/finance#amount' },
  { path: 'finance.creditCardNumber', description: 'Random credit card', example: '4111-1111-1111-1111', category: 'Finance' },
  { path: 'finance.currencyCode', description: 'Random currency code', example: 'USD', category: 'Finance' },

  // Image
  { path: 'image.url', description: 'Random image URL', example: 'https://loremflickr.com/640/480', category: 'Image' },
  { path: 'image.avatar', description: 'Random avatar URL', example: 'https://avatars.githubusercontent.com/u/12345', category: 'Image' },
];

export function getFakerInsertText(path: string, withArgsTemplate = false): string {
  const fn = FAKER_FUNCTIONS.find((item) => item.path === path);
  const args = withArgsTemplate ? (fn?.argsTemplate ?? '') : '';
  return `{{$faker.${path}(${args})`;
}

export function getFakerInfoByVariable(variableName: string): FakerFunction | undefined {
  if (!variableName.startsWith('$faker.')) {
    return undefined;
  }

  const match = variableName.match(/^\$faker\.([a-zA-Z.]+)\([\s\S]*\)$/);
  if (!match) {
    return undefined;
  }

  const path = match[1];
  return FAKER_FUNCTIONS.find((fn) => fn.path === path);
}

export function getFakerDocsUrl(path: string, explicitUrl?: string): string {
  if (explicitUrl) {
    return explicitUrl;
  }

  const category = path.split('.')[0];
  return `https://fakerjs.dev/api/${category}`;
}

/**
 * Execute a faker function by path
 * @param path - Dot notation path (e.g., "person.firstName")
 * @param argsSource - Optional argument source passed inside ()
 * @returns Generated fake data
 */
export function executeFakerFunction(path: string, argsSource = ''): string {
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
      const args = parseFakerArgs(argsSource);
      const result = current(...args);
      return String(result);
    }

    throw new Error(`${path} is not a function`);
  } catch (error) {
    return `{{$faker.${path}(${argsSource})}}`;  // Return original if fails
  }
}

/**
 * Replace all faker variables in text
 * Pattern: {{$faker.path.to.function(...args)}}
 */
export function replaceFakerVariables(text: string): string {
  if (!text) return text;

  // Match {{$faker.XXX(...)}} pattern
  const pattern = /\{\{\$faker\.([a-zA-Z.]+)\(([\s\S]*?)\)\}\}/g;

  return text.replace(pattern, (_match, path, argsSource) => {
    return executeFakerFunction(path, argsSource);
  });
}
