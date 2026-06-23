import * as fs from 'fs';
import * as path from 'path';

export interface TestDocumentation {
  testName: string;
  description: string;
  purpose: string;
  steps: string[];
  expectedResult: string;
  preconditions?: string[];
  postconditions?: string[];
  tags: string[];
}

export interface DocumentationConfig {
  format: 'markdown' | 'html' | 'json';
  includeMetadata: boolean;
  includeCoverage: boolean;
  outputDir: string;
}

export class TestDocGenerator {
  private tests: TestDocumentation[] = [];
  private config: DocumentationConfig;

  constructor(config: DocumentationConfig) {
    this.config = config;
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  addTest(test: TestDocumentation): void {
    this.tests.push(test);
  }

  addTests(tests: TestDocumentation[]): void {
    this.tests.push(...tests);
  }

  generateDocumentation(filename: string): string {
    switch (this.config.format) {
      case 'markdown':
        return this.generateMarkdown(filename);
      case 'html':
        return this.generateHTML(filename);
      case 'json':
        return this.generateJSON(filename);
      default:
        throw new Error(`Unsupported format: ${this.config.format}`);
    }
  }

  private generateMarkdown(filename: string): string {
    let content = '# Test Documentation\n\n';
    content += `Generated: ${new Date().toISOString()}\n\n`;

    if (this.config.includeMetadata) {
      content += `## Metadata\n`;
      content += `- Total Tests: ${this.tests.length}\n`;
      content += `- Tags: ${this.getUniqueTags().join(', ')}\n\n`;
    }

    content += `## Tests\n\n`;

    this.tests.forEach((test) => {
      content += `### ${test.testName}\n\n`;
      content += `**Description:** ${test.description}\n\n`;
      content += `**Purpose:** ${test.purpose}\n\n`;

      if (test.preconditions && test.preconditions.length > 0) {
        content += `**Preconditions:**\n`;
        test.preconditions.forEach((p) => {
          content += `- ${p}\n`;
        });
        content += '\n';
      }

      content += `**Steps:**\n`;
      test.steps.forEach((step, idx) => {
        content += `${idx + 1}. ${step}\n`;
      });
      content += '\n';

      content += `**Expected Result:** ${test.expectedResult}\n\n`;

      if (test.postconditions && test.postconditions.length > 0) {
        content += `**Postconditions:**\n`;
        test.postconditions.forEach((p) => {
          content += `- ${p}\n`;
        });
        content += '\n';
      }

      if (test.tags.length > 0) {
        content += `**Tags:** ${test.tags.join(', ')}\n\n`;
      }

      content += '---\n\n';
    });

    const filepath = path.join(this.config.outputDir, filename);
    fs.writeFileSync(filepath, content);
    return filepath;
  }

  private generateHTML(filename: string): string {
    let content = `<!DOCTYPE html>
<html>
<head>
  <title>Test Documentation</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 20px; }
    h3 { color: #888; }
    .test { border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .metadata { background-color: #f5f5f5; padding: 10px; border-radius: 3px; }
    ol { margin-left: 20px; }
    .tags { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Test Documentation</h1>
  <p>Generated: ${new Date().toISOString()}</p>
`;

    if (this.config.includeMetadata) {
      content += `
  <div class="metadata">
    <h2>Metadata</h2>
    <p>Total Tests: ${this.tests.length}</p>
    <p>Tags: ${this.getUniqueTags().join(', ')}</p>
  </div>
`;
    }

    content += `  <h2>Tests</h2>\n`;

    this.tests.forEach((test) => {
      content += `
  <div class="test">
    <h3>${test.testName}</h3>
    <p><strong>Description:</strong> ${test.description}</p>
    <p><strong>Purpose:</strong> ${test.purpose}</p>
`;

      if (test.preconditions && test.preconditions.length > 0) {
        content += `    <p><strong>Preconditions:</strong></p><ul>`;
        test.preconditions.forEach((p) => {
          content += `<li>${p}</li>`;
        });
        content += `</ul>\n`;
      }

      content += `    <p><strong>Steps:</strong></p><ol>`;
      test.steps.forEach((step) => {
        content += `<li>${step}</li>`;
      });
      content += `</ol>\n`;

      content += `    <p><strong>Expected Result:</strong> ${test.expectedResult}</p>\n`;

      if (test.postconditions && test.postconditions.length > 0) {
        content += `    <p><strong>Postconditions:</strong></p><ul>`;
        test.postconditions.forEach((p) => {
          content += `<li>${p}</li>`;
        });
        content += `</ul>\n`;
      }

      if (test.tags.length > 0) {
        content += `    <p class="tags"><strong>Tags:</strong> ${test.tags.join(', ')}</p>\n`;
      }

      content += `  </div>\n`;
    });

    content += `
</body>
</html>`;

    const filepath = path.join(this.config.outputDir, filename);
    fs.writeFileSync(filepath, content);
    return filepath;
  }

  private generateJSON(filename: string): string {
    const doc = {
      metadata: this.config.includeMetadata
        ? {
            generatedAt: new Date().toISOString(),
            totalTests: this.tests.length,
            tags: this.getUniqueTags(),
          }
        : undefined,
      tests: this.tests,
    };

    const filepath = path.join(this.config.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(doc, null, 2));
    return filepath;
  }

  private getUniqueTags(): string[] {
    const tags = new Set<string>();
    this.tests.forEach((test) => {
      test.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  getTestsByTag(tag: string): TestDocumentation[] {
    return this.tests.filter((t) => t.tags.includes(tag));
  }

  getTestCount(): number {
    return this.tests.length;
  }

  getTagCount(): number {
    return this.getUniqueTags().length;
  }

  clear(): void {
    this.tests = [];
  }

  exportAllFormats(baseFilename: string): { markdown: string; html: string; json: string } {
    return {
      markdown: this.generateMarkdownOnly(baseFilename),
      html: this.generateHTMLOnly(baseFilename),
      json: this.generateJSONOnly(baseFilename),
    };
  }

  private generateMarkdownOnly(baseFilename: string): string {
    const originalFormat = this.config.format;
    this.config.format = 'markdown';
    const result = this.generateDocumentation(`${baseFilename}.md`);
    this.config.format = originalFormat;
    return result;
  }

  private generateHTMLOnly(baseFilename: string): string {
    const originalFormat = this.config.format;
    this.config.format = 'html';
    const result = this.generateDocumentation(`${baseFilename}.html`);
    this.config.format = originalFormat;
    return result;
  }

  private generateJSONOnly(baseFilename: string): string {
    const originalFormat = this.config.format;
    this.config.format = 'json';
    const result = this.generateDocumentation(`${baseFilename}.json`);
    this.config.format = originalFormat;
    return result;
  }
}
