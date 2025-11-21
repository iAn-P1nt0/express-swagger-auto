import { parse as parseComments, Block } from 'comment-parser';
import { readFileSync } from 'fs';

export interface ExtractedComment {
  comment: Block;
  source: string;
  location: {
    file: string;
    line: number;
  };
}

export interface CommentExtractorOptions {
  includeNonOpenAPI?: boolean; // Include comments without @openapi tag
  encoding?: BufferEncoding;
}

/**
 * Extracts JSDoc comments from source files
 * Phase 3: JSDoc parser implementation
 */
export class CommentExtractor {
  private options: Required<CommentExtractorOptions>;

  constructor(options: CommentExtractorOptions = {}) {
    this.options = {
      includeNonOpenAPI: options.includeNonOpenAPI ?? false,
      encoding: options.encoding ?? 'utf-8',
    };
  }

  /**
   * Extract all JSDoc comments from a source file
   */
  extractFromFile(filePath: string): ExtractedComment[] {
    try {
      const source = readFileSync(filePath, this.options.encoding);
      return this.extractFromSource(source, filePath);
    } catch (error) {
      console.error(`[CommentExtractor] Failed to read file: ${filePath}`, error);
      return [];
    }
  }

  /**
   * Extract JSDoc comments from source code string
   */
  extractFromSource(source: string, filePath = '<anonymous>'): ExtractedComment[] {
    try {
      const parsed = parseComments(source, {
        spacing: 'preserve',
      });

      const results: ExtractedComment[] = [];

      for (const comment of parsed) {
        // Filter for OpenAPI comments if configured
        if (!this.options.includeNonOpenAPI) {
          const hasOpenAPITag = comment.tags.some(
            (tag) => tag.tag === 'openapi' || tag.tag === 'route'
          );

          if (!hasOpenAPITag) {
            continue;
          }
        }

        results.push({
          comment,
          source: this.reconstructComment(comment),
          location: {
            file: filePath,
            line: comment.source[0]?.number ?? 0,
          },
        });
      }

      return results;
    } catch (error) {
      console.error(`[CommentExtractor] Failed to parse comments in: ${filePath}`, error);
      return [];
    }
  }

  /**
   * Reconstruct the original comment text from parsed structure
   */
  private reconstructComment(comment: Block): string {
    const lines: string[] = ['/**'];

    if (comment.description) {
      lines.push(` * ${comment.description}`);
    }

    for (const tag of comment.tags) {
      const parts = [` * @${tag.tag}`];

      if (tag.name) parts.push(tag.name);
      if (tag.type) parts.push(`{${tag.type}}`);
      if (tag.description) parts.push(tag.description);

      lines.push(parts.join(' '));
    }

    lines.push(' */');
    return lines.join('\n');
  }

  /**
   * Check if a comment block contains OpenAPI documentation
   */
  isOpenAPIComment(comment: Block): boolean {
    return comment.tags.some((tag) => tag.tag === 'openapi' || tag.tag === 'route');
  }

  /**
   * Get tag by name from comment block
   */
  getTag(comment: Block, tagName: string): Block['tags'][0] | undefined {
    return comment.tags.find((tag) => tag.tag === tagName);
  }

  /**
   * Get all tags with specific name from comment block
   */
  getTags(comment: Block, tagName: string): Block['tags'] {
    return comment.tags.filter((tag) => tag.tag === tagName);
  }
}
