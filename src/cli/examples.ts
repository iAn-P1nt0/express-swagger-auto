/**
 * Examples command - Generate realistic examples using field patterns
 * Uses built-in patterns for common field names, with optional Faker.js support
 */

import type { OpenAPIV3 } from 'openapi-types';

// ============================================================
// Types
// ============================================================

export interface ExamplesOptions {
  locale?: string;
  seed?: number;
  count?: number;
  overwrite?: boolean;
  inplace?: boolean;
  output?: string;
}

export interface GeneratedExample {
  path: string;
  method: string;
  type: 'request' | 'response';
  example: unknown;
}

// ============================================================
// Field Pattern Matchers
// ============================================================

interface FieldPattern {
  patterns: RegExp[];
  generator: () => unknown;
}

// Seeded random number generator for reproducibility
class SeededRandom {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
}

// Create random instance for example generation
let random = new SeededRandom();

export function setSeed(seed: number): void {
  random = new SeededRandom(seed);
}

// ============================================================
// Built-in Example Generators
// ============================================================

const firstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Taylor'];
const domains = ['example.com', 'test.org', 'sample.net', 'demo.io'];
const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Cedar Ln', 'Elm Dr', 'Maple Blvd', 'Park Way'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
const countries = ['USA', 'Canada', 'UK', 'Australia', 'Germany', 'France', 'Japan', 'Brazil'];
const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white', 'gray'];
const statuses = ['active', 'inactive', 'pending', 'completed', 'cancelled'];
const priorities = ['low', 'medium', 'high', 'critical'];
const categories = ['electronics', 'clothing', 'food', 'services', 'entertainment', 'sports', 'health'];

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(random.next() * 16);
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateEmail(name?: string): string {
  const firstName = name || random.pick(firstNames).toLowerCase();
  const lastName = random.pick(lastNames).toLowerCase();
  const domain = random.pick(domains);
  return `${firstName}.${lastName}@${domain}`;
}

function generatePhone(): string {
  const area = random.int(200, 999);
  const exchange = random.int(200, 999);
  const subscriber = random.int(1000, 9999);
  return `+1-${area}-${exchange}-${subscriber}`;
}

function generateUrl(): string {
  const protocols = ['https'];
  const protocol = random.pick(protocols);
  const domain = random.pick(domains);
  const paths = ['users', 'products', 'api', 'data', 'resources'];
  const pathPart = random.pick(paths);
  return `${protocol}://${domain}/${pathPart}/${generateUUID()}`;
}

function generateImageUrl(): string {
  const width = random.pick([200, 400, 600, 800]);
  const height = random.pick([200, 400, 600, 800]);
  return `https://picsum.photos/${width}/${height}`;
}

function generateDateTime(): string {
  const now = new Date();
  const daysAgo = random.int(0, 365);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function generateDate(): string {
  return generateDateTime().split('T')[0];
}

function generatePrice(): number {
  return Math.round(random.next() * 1000 * 100) / 100;
}

function generateAmount(): number {
  return Math.round(random.next() * 10000 * 100) / 100;
}

function generatePercentage(): number {
  return Math.round(random.next() * 100 * 10) / 10;
}

function generateAge(): number {
  return random.int(18, 80);
}

function generateCount(): number {
  return random.int(1, 100);
}

function generateRating(): number {
  return Math.round(random.next() * 5 * 10) / 10;
}

function generateLatitude(): number {
  return Math.round((random.next() * 180 - 90) * 1000000) / 1000000;
}

function generateLongitude(): number {
  return Math.round((random.next() * 360 - 180) * 1000000) / 1000000;
}

function generateIpAddress(): string {
  return `${random.int(1, 255)}.${random.int(0, 255)}.${random.int(0, 255)}.${random.int(0, 255)}`;
}

function generateMacAddress(): string {
  const hex = () => random.int(0, 255).toString(16).padStart(2, '0');
  return `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
}

function generateCreditCard(): string {
  const type = random.pick(['4', '5', '3']); // Visa, MC, Amex
  const digits = type === '3' ? 15 : 16;
  let number = type;
  for (let i = 1; i < digits; i++) {
    number += random.int(0, 9).toString();
  }
  return number;
}

function generateDescription(): string {
  const sentences = [
    'This is a sample description.',
    'A detailed overview of the item.',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    'An excellent choice for modern applications.',
    'Designed with quality and performance in mind.',
  ];
  return random.pick(sentences);
}

function generateTitle(): string {
  const adjectives = ['Amazing', 'Premium', 'Essential', 'Professional', 'Advanced'];
  const nouns = ['Product', 'Service', 'Solution', 'Package', 'System'];
  return `${random.pick(adjectives)} ${random.pick(nouns)}`;
}

function generateSlug(): string {
  const words = ['sample', 'test', 'demo', 'example', 'item'];
  return `${random.pick(words)}-${random.pick(words)}-${random.int(100, 999)}`;
}

// Field patterns with regex matchers
const fieldPatterns: FieldPattern[] = [
  // UUID/ID patterns
  { patterns: [/^id$/i, /uuid/i, /guid/i, /_id$/i], generator: generateUUID },
  
  // Email patterns
  { patterns: [/email/i, /e-mail/i, /mail$/i], generator: () => generateEmail() },
  
  // Name patterns
  { patterns: [/^name$/i, /^fullname$/i, /^full_name$/i], generator: () => `${random.pick(firstNames)} ${random.pick(lastNames)}` },
  { patterns: [/firstname/i, /first_name/i, /^first$/i], generator: () => random.pick(firstNames) },
  { patterns: [/lastname/i, /last_name/i, /^last$/i, /surname/i], generator: () => random.pick(lastNames) },
  { patterns: [/username/i, /user_name/i, /^user$/i], generator: () => `${random.pick(firstNames).toLowerCase()}${random.int(1, 999)}` },
  
  // Contact patterns
  { patterns: [/phone/i, /mobile/i, /tel/i, /cell/i], generator: generatePhone },
  
  // URL patterns
  { patterns: [/^url$/i, /^uri$/i, /^link$/i, /website/i, /homepage/i], generator: generateUrl },
  { patterns: [/image/i, /photo/i, /avatar/i, /picture/i, /thumbnail/i, /icon/i], generator: generateImageUrl },
  
  // Date/Time patterns
  { patterns: [/created_at/i, /createdat/i, /updated_at/i, /updatedat/i, /^timestamp$/i], generator: generateDateTime },
  { patterns: [/^date$/i, /birthday/i, /birth_date/i, /dob$/i], generator: generateDate },
  
  // Money patterns
  { patterns: [/price/i, /cost/i, /fee/i, /rate$/i], generator: generatePrice },
  { patterns: [/amount/i, /total/i, /balance/i, /salary/i, /revenue/i], generator: generateAmount },
  { patterns: [/percent/i, /percentage/i, /ratio/i, /discount/i], generator: generatePercentage },
  
  // Count patterns
  { patterns: [/count/i, /quantity/i, /qty/i, /number$/i, /num$/i], generator: generateCount },
  { patterns: [/^age$/i], generator: generateAge },
  { patterns: [/rating/i, /score/i, /stars/i], generator: generateRating },
  
  // Address patterns
  { patterns: [/address/i, /street/i], generator: () => `${random.int(100, 9999)} ${random.pick(streets)}` },
  { patterns: [/city/i, /town/i], generator: () => random.pick(cities) },
  { patterns: [/country/i, /nation/i], generator: () => random.pick(countries) },
  { patterns: [/zip/i, /postal/i, /postcode/i], generator: () => `${random.int(10000, 99999)}` },
  { patterns: [/latitude/i, /lat$/i], generator: generateLatitude },
  { patterns: [/longitude/i, /lng$/i, /lon$/i], generator: generateLongitude },
  
  // Technical patterns
  { patterns: [/^ip$/i, /ip_address/i, /ipaddress/i], generator: generateIpAddress },
  { patterns: [/mac/i], generator: generateMacAddress },
  { patterns: [/credit_card/i, /card_number/i, /creditcard/i], generator: generateCreditCard },
  
  // Status patterns
  { patterns: [/^status$/i, /^state$/i], generator: () => random.pick(statuses) },
  { patterns: [/priority/i], generator: () => random.pick(priorities) },
  { patterns: [/category/i, /type$/i], generator: () => random.pick(categories) },
  { patterns: [/color/i, /colour/i], generator: () => random.pick(colors) },
  
  // Text patterns
  { patterns: [/description/i, /desc$/i, /bio$/i, /about/i, /summary/i], generator: generateDescription },
  { patterns: [/title/i, /heading/i, /subject/i], generator: generateTitle },
  { patterns: [/slug/i, /permalink/i, /handle/i], generator: generateSlug },
  
  // Boolean patterns
  { patterns: [/^is_/i, /^has_/i, /^can_/i, /^enabled$/i, /^active$/i, /^verified$/i], generator: () => random.next() > 0.5 },
];

// ============================================================
// Example Generation
// ============================================================

function matchFieldPattern(fieldName: string): (() => unknown) | null {
  for (const pattern of fieldPatterns) {
    for (const regex of pattern.patterns) {
      if (regex.test(fieldName)) {
        return pattern.generator;
      }
    }
  }
  return null;
}

function generateExampleForSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  fieldName: string,
  spec: OpenAPIV3.Document,
  depth: number = 0
): unknown {
  if (!schema || depth > 10) return null;
  
  // Resolve $ref
  if ('$ref' in schema) {
    const refPath = (schema as OpenAPIV3.ReferenceObject).$ref.replace('#/components/schemas/', '');
    const resolved = spec.components?.schemas?.[refPath] as OpenAPIV3.SchemaObject;
    return generateExampleForSchema(resolved, fieldName, spec, depth + 1);
  }

  const s = schema as OpenAPIV3.SchemaObject;

  // Use existing example if present
  if (s.example !== undefined) return s.example;

  // Check enum FIRST - always use enum values if specified
  if (s.enum && s.enum.length > 0) {
    return random.pick(s.enum as unknown[]);
  }

  // Check if field name matches a known pattern
  const patternGenerator = matchFieldPattern(fieldName);
  if (patternGenerator) {
    return patternGenerator();
  }

  // Handle by type
  switch (s.type) {
    case 'string':
      // Check format first
      if (s.format === 'email') return generateEmail();
      if (s.format === 'date-time') return generateDateTime();
      if (s.format === 'date') return generateDate();
      if (s.format === 'uuid') return generateUUID();
      if (s.format === 'uri' || s.format === 'url') return generateUrl();
      if (s.format === 'ipv4') return generateIpAddress();
      
      // Check min/max length
      const minLen = s.minLength ?? 1;
      const maxLen = Math.min(s.maxLength ?? 50, 50);
      const len = random.int(minLen, maxLen);
      
      // Generate a string of appropriate length
      const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];
      let result = '';
      while (result.length < len) {
        result += random.pick(words) + ' ';
      }
      return result.trim().substring(0, len);

    case 'integer':
    case 'number':
      const min = s.minimum ?? 0;
      const max = s.maximum ?? 1000;
      const num = s.type === 'integer' 
        ? random.int(Math.ceil(min), Math.floor(max))
        : Math.round((min + random.next() * (max - min)) * 100) / 100;
      return num;

    case 'boolean':
      return random.next() > 0.5;

    case 'array':
      const itemSchema = s.items as OpenAPIV3.SchemaObject;
      const count = random.int(1, 3);
      const items: unknown[] = [];
      for (let i = 0; i < count; i++) {
        items.push(generateExampleForSchema(itemSchema, fieldName, spec, depth + 1));
      }
      return items;

    case 'object':
      const obj: Record<string, unknown> = {};
      if (s.properties) {
        for (const [key, propSchema] of Object.entries(s.properties)) {
          obj[key] = generateExampleForSchema(
            propSchema as OpenAPIV3.SchemaObject,
            key,
            spec,
            depth + 1
          );
        }
      }
      return obj;

    default:
      // Handle allOf, oneOf, anyOf
      if (s.allOf) {
        const merged: Record<string, unknown> = {};
        for (const subSchema of s.allOf) {
          const subExample = generateExampleForSchema(subSchema, fieldName, spec, depth + 1);
          if (typeof subExample === 'object' && subExample !== null) {
            Object.assign(merged, subExample);
          }
        }
        return merged;
      }
      if (s.oneOf || s.anyOf) {
        const options = s.oneOf || s.anyOf;
        const selected = random.pick(options as OpenAPIV3.SchemaObject[]);
        return generateExampleForSchema(selected, fieldName, spec, depth + 1);
      }
      
      return null;
  }
}

// ============================================================
// Main Functions
// ============================================================

export function generateExamples(
  spec: OpenAPIV3.Document,
  options: ExamplesOptions = {}
): { spec: OpenAPIV3.Document; generated: GeneratedExample[] } {
  // Set seed if provided
  if (options.seed !== undefined) {
    setSeed(options.seed);
  }

  const generated: GeneratedExample[] = [];
  const modifiedSpec = JSON.parse(JSON.stringify(spec)) as OpenAPIV3.Document;

  const paths = modifiedSpec.paths || {};

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;
    const pathObject = pathItem as OpenAPIV3.PathItemObject;

    const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;

    for (const method of methods) {
      const operation = pathObject[method];
      if (!operation) continue;

      // Generate request body examples
      const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined;
      if (requestBody?.content) {
        for (const [contentType, mediaType] of Object.entries(requestBody.content)) {
          if (mediaType.schema && (options.overwrite || !mediaType.example)) {
            const example = generateExampleForSchema(
              mediaType.schema as OpenAPIV3.SchemaObject,
              'requestBody',
              spec
            );
            mediaType.example = example;
            generated.push({
              path: pathKey,
              method: method.toUpperCase(),
              type: 'request',
              example,
            });
          }
        }
      }

      // Generate response examples
      if (operation.responses) {
        for (const [statusCode, response] of Object.entries(operation.responses)) {
          const responseObj = response as OpenAPIV3.ResponseObject;
          if (responseObj.content) {
            for (const [contentType, mediaType] of Object.entries(responseObj.content)) {
              if (mediaType.schema && (options.overwrite || !mediaType.example)) {
                const example = generateExampleForSchema(
                  mediaType.schema as OpenAPIV3.SchemaObject,
                  'response',
                  spec
                );
                mediaType.example = example;
                generated.push({
                  path: pathKey,
                  method: method.toUpperCase(),
                  type: 'response',
                  example,
                });
              }
            }
          }
        }
      }
    }
  }

  // Also generate examples for component schemas
  if (modifiedSpec.components?.schemas) {
    for (const [schemaName, schema] of Object.entries(modifiedSpec.components.schemas)) {
      const schemaObj = schema as OpenAPIV3.SchemaObject;
      if (options.overwrite || !schemaObj.example) {
        const example = generateExampleForSchema(schemaObj, schemaName, spec);
        schemaObj.example = example;
      }
    }
  }

  return { spec: modifiedSpec, generated };
}

export function previewExamples(
  spec: OpenAPIV3.Document,
  options: ExamplesOptions = {}
): GeneratedExample[] {
  // Set seed if provided
  if (options.seed !== undefined) {
    setSeed(options.seed);
  }

  const generated: GeneratedExample[] = [];

  const paths = spec.paths || {};

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;
    const pathObject = pathItem as OpenAPIV3.PathItemObject;

    const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;

    for (const method of methods) {
      const operation = pathObject[method];
      if (!operation) continue;

      // Preview request body examples
      const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined;
      if (requestBody?.content) {
        for (const [contentType, mediaType] of Object.entries(requestBody.content)) {
          if (mediaType.schema && (options.overwrite || !mediaType.example)) {
            const example = generateExampleForSchema(
              mediaType.schema as OpenAPIV3.SchemaObject,
              'requestBody',
              spec
            );
            generated.push({
              path: pathKey,
              method: method.toUpperCase(),
              type: 'request',
              example,
            });
          }
        }
      }

      // Preview response examples
      if (operation.responses) {
        for (const [statusCode, response] of Object.entries(operation.responses)) {
          const responseObj = response as OpenAPIV3.ResponseObject;
          if (responseObj.content) {
            for (const [contentType, mediaType] of Object.entries(responseObj.content)) {
              if (mediaType.schema && (options.overwrite || !mediaType.example)) {
                const example = generateExampleForSchema(
                  mediaType.schema as OpenAPIV3.SchemaObject,
                  'response',
                  spec
                );
                generated.push({
                  path: pathKey,
                  method: method.toUpperCase(),
                  type: 'response',
                  example,
                });
              }
            }
          }
        }
      }
    }
  }

  return generated;
}

export function formatExamplesPreview(
  examples: GeneratedExample[],
  format: 'text' | 'json' | 'markdown' = 'text'
): string {
  if (format === 'json') {
    return JSON.stringify(examples, null, 2);
  }

  if (format === 'markdown') {
    let output = '# Generated Examples\n\n';
    
    const byPath: Record<string, GeneratedExample[]> = {};
    for (const ex of examples) {
      const key = `${ex.method} ${ex.path}`;
      if (!byPath[key]) byPath[key] = [];
      byPath[key].push(ex);
    }

    for (const [endpoint, exs] of Object.entries(byPath)) {
      output += `## ${endpoint}\n\n`;
      for (const ex of exs) {
        output += `### ${ex.type === 'request' ? 'Request Body' : 'Response'}\n\n`;
        output += '```json\n';
        output += JSON.stringify(ex.example, null, 2);
        output += '\n```\n\n';
      }
    }

    return output;
  }

  // Text format
  let output = '📝 Generated Examples\n\n';

  const byPath: Record<string, GeneratedExample[]> = {};
  for (const ex of examples) {
    const key = `${ex.method} ${ex.path}`;
    if (!byPath[key]) byPath[key] = [];
    byPath[key].push(ex);
  }

  for (const [endpoint, exs] of Object.entries(byPath)) {
    output += `\x1b[36m${endpoint}\x1b[0m\n`;
    for (const ex of exs) {
      output += `  ${ex.type === 'request' ? '📤 Request' : '📥 Response'}:\n`;
      const jsonStr = JSON.stringify(ex.example, null, 2);
      output += jsonStr.split('\n').map(line => `    ${line}`).join('\n');
      output += '\n';
    }
    output += '\n';
  }

  return output;
}
