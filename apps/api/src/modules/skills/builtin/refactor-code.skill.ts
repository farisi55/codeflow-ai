import type { ISkill } from '../interfaces/skill.interface';

export class RefactorCodeSkill implements ISkill {
  readonly id = 'refactor-code';
  readonly name = 'Refactor Code';
  readonly description =
    'Improves code quality, readability, and structure';
  readonly triggers = [
    /\b(refactor|clean up|improve|optimize|restructure|rewrite|simplify)\b/i,
  ];

  getSystemPrompt(): string {
    return `You are an expert code refactoring assistant in CodeFlow AI.
When refactoring code:
- Preserve the original functionality exactly
- Improve readability and maintainability
- Apply relevant design patterns where appropriate
- Reduce duplication (DRY principle)
- Improve naming for clarity
- Always show the refactored code in a properly labeled code block
- Briefly explain the key changes you made`;
  }
}
