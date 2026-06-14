import { Injectable, Logger } from '@nestjs/common';

import {
  TASK_PROVIDER_MAP,
  TaskType,
} from '../interfaces/task.interface';

@Injectable()
export class TaskRouterService {
  private readonly logger = new Logger(TaskRouterService.name);

  detectTaskType(message: string): TaskType {
    const normalized = message.toLowerCase();

    if (normalized.length > 3000) {
      return TaskType.LARGE_CONTEXT;
    }

    if (
      /\b(refactor|clean up|improve|optimize code|restructure|rewrite|refaktor|rapikan|optimalkan|sederhanakan|restrukturisasi)\b/.test(
        normalized,
      )
    ) {
      return TaskType.REFACTOR;
    }

    if (
      /\b(document|jsdoc|add comment|write docs|readme|explain what this does)\b/.test(
        normalized,
      )
    ) {
      return TaskType.DOCUMENTATION;
    }

    if (
      /\b(review|audit|find bug|what.s wrong|check (this|my) code|code review)\b/.test(
        normalized,
      )
    ) {
      return TaskType.CODE_REVIEW;
    }

    if (
      /\b(architect|design (a |the )?system|folder structure|how should i (build|structure|organize))\b/.test(
        normalized,
      )
    ) {
      return TaskType.ARCHITECTURE;
    }

    if (
      /\b(generate|create|write|implement|add (a |the )?function|build (a |the )?component|make (a |the )?|ubah|ganti|tambahkan|tambah|hapus|perbaiki|buat|implementasikan|modifikasi)\b/.test(
        normalized,
      )
    ) {
      return TaskType.CODE_GENERATION;
    }

    if (
      /\b(what is|how does|explain|why (does|is|would)|what does|tell me about)\b/.test(
        normalized,
      )
    ) {
      return TaskType.QUICK_QUESTION;
    }

    return TaskType.GENERAL;
  }

  getProviderOrder(
    message: string,
    requestedProvider: string,
  ): string[] {
    const taskType = this.detectTaskType(message);
    const defaultOrder = TASK_PROVIDER_MAP[taskType];
    const backendProvider =
      requestedProvider === 'puter' ? 'auto' : requestedProvider;

    if (backendProvider && backendProvider !== 'auto') {
      return [
        backendProvider,
        ...defaultOrder.filter(
          (providerId) => providerId !== backendProvider,
        ),
      ];
    }

    this.logger.debug(`Detected task type: ${taskType}`);
    return [...defaultOrder];
  }
}
