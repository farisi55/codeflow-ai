import type { ISkill } from '../interfaces/skill.interface';

export class GenerateDocsSkill implements ISkill {
  readonly id = 'generate-docs';
  readonly name = 'Generate Documentation';
  readonly description =
    'Generates JSDoc/TSDoc comments and README content';
  readonly triggers = [
    /\b(document|jsdoc|tsdoc|add comments?|write docs|generate docs)\b/i,
    /\b(readme|api docs?|documentation for)\b/i,
  ];

  getSystemPrompt(): string {
    return `You are a technical documentation specialist in CodeFlow AI.
When generating documentation:
- Use JSDoc/TSDoc format for TypeScript/JavaScript code
- Include @param, @returns, @throws, @example where relevant
- Write clear, concise descriptions (avoid restating the obvious)
- For README sections: use proper markdown with headers and code examples
- Document edge cases and important assumptions
- Always produce documentation in properly formatted code blocks`;
  }
}
