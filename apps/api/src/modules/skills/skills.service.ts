import { Injectable, Logger } from '@nestjs/common';

import { ExplainCodeSkill } from './builtin/explain-code.skill';
import { GenerateDocsSkill } from './builtin/generate-docs.skill';
import { RefactorCodeSkill } from './builtin/refactor-code.skill';
import type { ISkill } from './interfaces/skill.interface';

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);
  private readonly registry = new Map<string, ISkill>();

  constructor() {
    this.register(new ExplainCodeSkill());
    this.register(new RefactorCodeSkill());
    this.register(new GenerateDocsSkill());

    this.logger.log(
      `Skills loaded: [${[...this.registry.keys()].join(', ')}]`,
    );
  }

  register(skill: ISkill): void {
    this.registry.set(skill.id, skill);
  }

  detectSkill(message: string): ISkill | null {
    for (const skill of this.registry.values()) {
      if (skill.triggers.some((pattern) => pattern.test(message))) {
        this.logger.debug(`Skill matched: ${skill.id}`);
        return skill;
      }
    }
    return null;
  }

  getAllSkills(): ISkill[] {
    return [...this.registry.values()];
  }

  getSkill(id: string): ISkill | undefined {
    return this.registry.get(id);
  }
}
