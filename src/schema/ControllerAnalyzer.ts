/**
 * Analyzes controller functions to extract request/response schema information
 * Infers schemas from function parameters, return statements, and JSDoc comments
 */

export interface ControllerSchema {
  requestBody?: {
    type: 'object' | 'array' | 'string' | 'number' | 'boolean';
    properties?: Record<string, any>;
    required?: string[];
    description?: string;
  };
  responses?: {
    [statusCode: string]: {
      description: string;
      schema?: Record<string, any>;
      type?: string;
    };
  };
}

export interface FunctionParameter {
  name: string;
  type?: string;
  description?: string;
  isBody?: boolean;
  isQuery?: boolean;
  isPath?: boolean;
}

export class ControllerAnalyzer {
  /**
   * Analyze a controller function to extract schema information
   */
  analyzeController(
    controllerCode: string
  ): ControllerSchema {
    const schema: ControllerSchema = {};

    // Extract request body from function parameters
    const parameters = this.extractParameters(controllerCode);
    if (parameters.length > 0) {
      const bodyParam = parameters.find(p => p.isBody);
      if (bodyParam) {
        schema.requestBody = this.inferRequestSchema(controllerCode, bodyParam);
      }
    }

    // Extract response schemas from return statements
    schema.responses = this.extractResponseSchemas(controllerCode);

    return schema;
  }

  /**
   * Extract function parameters from controller code
   */
  private extractParameters(code: string): FunctionParameter[] {
    const parameters: FunctionParameter[] = [];

    // Match function declaration or arrow function
    const funcMatch = /(?:function\s+\w+\s*\(|[\w$]+\s*=\s*(?:async\s+)?\()\s*([^)]+)\s*\)/.exec(code);
    if (!funcMatch) {
      return parameters;
    }

    const paramsStr = funcMatch[1];
    const paramNames = paramsStr.split(',').map(p => p.trim());

    for (const param of paramNames) {
      // Extract parameter name (handles destructuring, type hints, etc.)
      const match = /^({[^}]+}|[^:=\s]+)/.exec(param);
      if (!match) continue;

      const name = match[1];
      const parameter: FunctionParameter = { name };

      // Detect if it's likely a body parameter (by name conventions)
      if (/(req|request|body|data|payload|input)/.test(name.toLowerCase())) {
        parameter.isBody = true;
      } else if (/(query|params|filter)/.test(name.toLowerCase())) {
        parameter.isQuery = true;
      }

      parameters.push(parameter);
    }

    return parameters;
  }

  /**
   * Infer request schema from parameter and code analysis
   */
  private inferRequestSchema(code: string, param: FunctionParameter): ControllerSchema['requestBody'] {
    const schema: ControllerSchema['requestBody'] = {
      type: 'object',
      properties: {},
    };

    // Extract field access patterns like req.body.email, req.body.password
    const fieldPattern = /(?:body|request|req)\.body\.(\w+)/g;
    let match;

    const fields = new Set<string>();
    while ((match = fieldPattern.exec(code)) !== null) {
      fields.add(match[1]);
    }

    // Convert fields to properties
    for (const field of fields) {
      schema.properties![field] = this.inferFieldType(code, field);
    }

    // Check for required fields (validation patterns)
    const required: string[] = [];
    for (const field of fields) {
      if (this.isFieldRequired(code, field)) {
        required.push(field);
      }
    }

    if (required.length > 0) {
      schema.required = required;
    }

    return Object.keys(schema.properties || {}).length > 0 ? schema : undefined;
  }

  /**
   * Infer field type from code context
   */
  private inferFieldType(code: string, fieldName: string): Record<string, any> {
    // Look for validation patterns
    if (/\.email\(\)|isEmail|validateEmail/.test(code) && code.includes(fieldName)) {
      return { type: 'string', format: 'email' };
    }

    if (/\.number\(\)|isNumber|parseInt|parseFloat/.test(code) && code.includes(fieldName)) {
      return { type: 'number' };
    }

    if (/\.boolean\(\)|isBoolean|!!/.test(code) && code.includes(fieldName)) {
      return { type: 'boolean' };
    }

    // Check for array usage
    if (new RegExp(`${fieldName}\\.map|${fieldName}\\.filter|Array\\.isArray\\(.*${fieldName}`).test(code)) {
      return { type: 'array', items: { type: 'string' } };
    }

    // Check for object usage
    if (new RegExp(`${fieldName}\.\\w+|Object\\.keys\\(.*${fieldName}`).test(code)) {
      return { type: 'object' };
    }

    // Default to string
    return { type: 'string' };
  }

  /**
   * Check if a field is required based on validation patterns
   */
  private isFieldRequired(code: string, fieldName: string): boolean {
    // Check for explicit required validations
    if (
      new RegExp(`${fieldName}[\\s\\S]{0,50}required|required[\\s\\S]{0,50}${fieldName}`).test(code) ||
      new RegExp(`${fieldName}[\\s\\S]{0,50}!== undefined|!== undefined[\\s\\S]{0,50}${fieldName}`).test(code) ||
      new RegExp(`${fieldName}[\\s\\S]{0,50}\\.required\\(\\)`).test(code)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Extract response schemas from return statements and res.send/json calls
   */
  private extractResponseSchemas(code: string): ControllerSchema['responses'] {
    const responses: ControllerSchema['responses'] = {};

    // Find success response (200)
    responses['200'] = {
      description: 'Successful response',
      schema: this.inferResponseType(code),
    };

    // Find error responses
    if (/throw|Error|error/.test(code)) {
      responses['400'] = {
        description: 'Bad request',
      };
      responses['500'] = {
        description: 'Internal server error',
      };
    }

    // Check for unauthorized
    if (/401|unauthorized|auth|token|jwt/.test(code.toLowerCase())) {
      responses['401'] = {
        description: 'Unauthorized - Authentication required',
      };
    }

    // Check for not found
    if (/404|notfound|not found|doesnt exist/.test(code.toLowerCase())) {
      responses['404'] = {
        description: 'Resource not found',
      };
    }

    // Check for forbidden
    if (/403|forbidden|permission/.test(code.toLowerCase())) {
      responses['403'] = {
        description: 'Forbidden - Insufficient permissions',
      };
    }

    return responses;
  }

  /**
   * Infer response type from return statements and send patterns
   */
  private inferResponseType(code: string): Record<string, any> {
    // Check for common response patterns
    if (/res\.json\s*\(\s*\{/.test(code)) {
      // Return structure with object pattern
      const objMatch = /res\.json\s*\(\s*({[^}]+})/s.exec(code);
      if (objMatch) {
        return this.parseObjectPattern(objMatch[1]);
      }
    }

    // Check for arrays
    if (/res\.json\s*\(\s*\[|res\.send\s*\(\s*\[/.test(code)) {
      return {
        type: 'array',
        items: { type: 'object' },
      };
    }

    // Look for response object construction
    if (/return\s*{|response\s*=\s*{/.test(code)) {
      const objMatch = /(?:return|response\s*=)\s*({[^}]+})/s.exec(code);
      if (objMatch) {
        return this.parseObjectPattern(objMatch[1]);
      }
    }

    // Default response
    return {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        message: { type: 'string' },
      },
    };
  }

  /**
   * Parse object pattern to extract properties
   */
  private parseObjectPattern(objStr: string): Record<string, any> {
    const properties: Record<string, any> = {};

    // Match key: value pairs
    const propertyPattern = /(\w+)\s*:\s*([^,}]+)/g;
    let match;

    while ((match = propertyPattern.exec(objStr)) !== null) {
      const [, key, value] = match;
      properties[key] = this.inferValueType(value);
    }

    return {
      type: 'object',
      properties: Object.keys(properties).length > 0 ? properties : undefined,
    };
  }

  /**
   * Infer type from value expression
   */
  private inferValueType(value: string): Record<string, any> {
    const trimmed = value.trim();

    if (trimmed === 'true' || trimmed === 'false') {
      return { type: 'boolean' };
    }

    if (/^\d+$/.test(trimmed)) {
      return { type: 'integer' };
    }

    if (/^\d+\.\d+$/.test(trimmed)) {
      return { type: 'number' };
    }

    if (/^['"`]|this\.\w+|user\.\w+|data\.\w+/.test(trimmed)) {
      return { type: 'string' };
    }

    if (/\[|map|filter/.test(trimmed)) {
      return { type: 'array' };
    }

    if (/{[^}]*}/.test(trimmed)) {
      return { type: 'object' };
    }

    return { type: 'string' };
  }

  /**
   * Extract JSDoc information for request/response
   */
  extractJsDocSchema(jsDocComment: string): ControllerSchema {
    const schema: ControllerSchema = {};

    // Look for @param tags for request body
    const paramPattern = /@param\s+{(\w+)}\s+(\w+)\s*-?\s*(.+?)(?=@|\n|$)/g;
    let match;

    while ((match = paramPattern.exec(jsDocComment)) !== null) {
      const [, type, name, description] = match;
      if (name.includes('body') || name.includes('data')) {
        if (!schema.requestBody) {
          schema.requestBody = { type: 'object', properties: {} };
        }
        if (schema.requestBody.properties) {
          schema.requestBody.properties[name] = {
            type: this.normalizeType(type),
            description: description.trim(),
          };
        }
      }
    }

    // Look for @returns or @response tags
    const returnsPattern = /@returns?\s+{(\w+)}\s*(.+?)(?=@|$)/s;
    const returnsMatch = returnsPattern.exec(jsDocComment);

    if (returnsMatch) {
      const [, returnType, description] = returnsMatch;
      if (!schema.responses) {
        schema.responses = {};
      }
      schema.responses['200'] = {
        description: description.trim() || 'Successful response',
        type: this.normalizeType(returnType),
      };
    }

    return schema;
  }

  /**
   * Normalize type names
   */
  private normalizeType(type: string): string {
    const typeMap: Record<string, string> = {
      'String': 'string',
      'string': 'string',
      'Number': 'number',
      'number': 'number',
      'Boolean': 'boolean',
      'boolean': 'boolean',
      'Array': 'array',
      'array': 'array',
      'Object': 'object',
      'object': 'object',
      'int': 'integer',
      'integer': 'integer',
      'float': 'number',
      'double': 'number',
    };

    return typeMap[type] || 'string';
  }

  /**
   * Detect if controller has async/await patterns
   */
  isAsync(code: string): boolean {
    return /async\s+(?:function|\w+\s*=>|\()|await\s+/.test(code);
  }

  /**
   * Detect if controller queries database
   */
  queriesDatabase(code: string): boolean {
    return /\.find|\.query|\.select|db\.|database\.|\.get\(|\.all\(/.test(code);
  }

  /**
   * Extract error handling patterns
   */
  extractErrorHandling(code: string): Array<{
    statusCode: number;
    message: string;
  }> {
    const errors: Array<{
      statusCode: number;
      message: string;
    }> = [];

    // Look for res.status(code).send/json patterns
    const statusPattern = /res\.status\((\d+)\)\.(?:send|json)\s*\(\s*[{"]?([^})]+)/g;
    let match;

    while ((match = statusPattern.exec(code)) !== null) {
      const [, statusCode, message] = match;
      errors.push({
        statusCode: parseInt(statusCode, 10),
        message: message.trim().slice(0, 100),
      });
    }

    return errors;
  }
}
