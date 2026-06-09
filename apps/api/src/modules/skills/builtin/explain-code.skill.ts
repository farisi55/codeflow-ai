import type { ISkill } from '../interfaces/skill.interface';

export class ExplainCodeSkill implements ISkill {
  readonly id = 'explain-code';
  readonly name = 'Explain Code';
  readonly description = 'Explains what code does in plain language';
  readonly triggers = [
    /\b(explain|what does|how does|walk me through|break down)\b/i,
    /\bwhat is (this|the|a)\b/i,
  ];

  getSystemPrompt(): string {
    return `You are an expert code explainer integrated into CodeFlow AI.
When explaining code:
- Start with a one-sentence summary of what the code does
- Break down the key parts step by step
- Use simple language, avoid jargon unless necessary
- Point out any potential issues or important patterns
- Use code blocks when referencing specific parts`;
  }
}
