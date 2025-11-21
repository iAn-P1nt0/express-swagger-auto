import { globSync } from 'glob';
import { CommentExtractor, ExtractedComment } from './CommentExtractor';
import { JsDocTransformer, JsDocMetadata } from './JsDocTransformer';

export interface JsDocParserOptions {
  /**
   * Glob patterns for source files to parse
   * Default: ['**\/*.js', '**\/*.ts']
   */
  sourceFiles?: string | string[];

  /**
   * Patterns to exclude
   * Default: ['node_modules/**', 'dist/**', 'build/**']
   */
  exclude?: string[];

  /**
   * Base directory for glob patterns
   */
  cwd?: string;

  /**
   * Include comments without @openapi tag
   */
  includeAll?: boolean;

  /**
   * Default tags to apply to all routes
   */
  defaultTags?: string[];

  /**
   * Throw on parsing errors
   */
  strictMode?: boolean;
}

export interface ParsedRoute {
  metadata: JsDocMetadata;
  comment: ExtractedComment;
}

/**
 * Main JSDoc parser for Phase 3
 * Discovers and parses JSDoc comments from source files
 * to generate OpenAPI route metadata
 */
export class JsDocParser {
  private extractor: CommentExtractor;
  private transformer: JsDocTransformer;
  private options: Required<JsDocParserOptions>;

  constructor(options: JsDocParserOptions = {}) {
    this.options = {
      sourceFiles: options.sourceFiles ?? ['**/*.js', '**/*.ts'],
      exclude: options.exclude ?? ['**/node_modules/**', '**/dist/**', '**/build/**'],
      cwd: options.cwd ?? process.cwd(),
      includeAll: options.includeAll ?? false,
      defaultTags: options.defaultTags ?? [],
      strictMode: options.strictMode ?? false,
    };

    this.extractor = new CommentExtractor({
      includeNonOpenAPI: this.options.includeAll,
    });

    this.transformer = new JsDocTransformer({
      defaultTags: this.options.defaultTags,
      strictMode: this.options.strictMode,
    });
  }

  /**
   * Parse all source files and extract route metadata
   */
  parse(): ParsedRoute[] {
    const files = this.discoverSourceFiles();
    const routes: ParsedRoute[] = [];

    for (const file of files) {
      const fileRoutes = this.parseFile(file);
      routes.push(...fileRoutes);
    }

    return routes;
  }

  /**
   * Parse a single source file
   */
  parseFile(filePath: string): ParsedRoute[] {
    const comments = this.extractor.extractFromFile(filePath);
    const routes: ParsedRoute[] = [];

    for (const extractedComment of comments) {
      const metadata = this.transformer.transform(extractedComment.comment);

      if (metadata) {
        routes.push({
          metadata,
          comment: extractedComment,
        });
      }
    }

    return routes;
  }

  /**
   * Parse source code string directly
   */
  parseSource(source: string, fileName = '<source>'): ParsedRoute[] {
    const comments = this.extractor.extractFromSource(source, fileName);
    const routes: ParsedRoute[] = [];

    for (const extractedComment of comments) {
      const metadata = this.transformer.transform(extractedComment.comment);

      if (metadata) {
        routes.push({
          metadata,
          comment: extractedComment,
        });
      }
    }

    return routes;
  }

  /**
   * Discover source files matching glob patterns
   */
  private discoverSourceFiles(): string[] {
    const patterns = Array.isArray(this.options.sourceFiles)
      ? this.options.sourceFiles
      : [this.options.sourceFiles];

    const files: Set<string> = new Set();

    for (const pattern of patterns) {
      const matches = globSync(pattern, {
        cwd: this.options.cwd,
        ignore: this.options.exclude,
        absolute: true,
      });

      matches.forEach((file) => files.add(file));
    }

    return Array.from(files);
  }

  /**
   * Get statistics about parsed files
   */
  getStats(): {
    filesScanned: number;
    routesFound: number;
    commentsProcessed: number;
  } {
    const files = this.discoverSourceFiles();
    let routesFound = 0;
    let commentsProcessed = 0;

    for (const file of files) {
      const comments = this.extractor.extractFromFile(file);
      commentsProcessed += comments.length;

      for (const comment of comments) {
        const metadata = this.transformer.transform(comment.comment);
        if (metadata) {
          routesFound++;
        }
      }
    }

    return {
      filesScanned: files.length,
      routesFound,
      commentsProcessed,
    };
  }
}
