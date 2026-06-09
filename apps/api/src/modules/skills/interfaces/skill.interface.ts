export interface ISkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly triggers: RegExp[];

  getSystemPrompt(userMessage?: string): string;
}
