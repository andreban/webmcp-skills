// Copyright 2026 Andre Cipriani Bandarra
// SPDX-License-Identifier: Apache-2.0

import { gradeAssertions } from './grader.js';
import { generateContent } from './provider.js';
import type { SingleRunResult, Skill } from './types.js';

export interface RunOptions {
  mode?: 'with-only' | 'comparison';
  filter?: string;
  model?: string;
  concurrency?: number;
  mock?: boolean;
}

/**
 * Runs evaluations for a specific skill.
 */
export async function runSkillEvals(
  skill: Skill,
  options: RunOptions = {},
): Promise<SingleRunResult[]> {
  const mode = options.mode || 'with-only';
  const filterRegex = options.filter ? new RegExp(options.filter, 'i') : null;

  const targetEvals = skill.evals.filter((item) => {
    if (!filterRegex) return true;
    return filterRegex.test(item.id) || filterRegex.test(item.prompt);
  });

  if (targetEvals.length === 0) {
    console.log(`[${skill.name}] No evals matched filter: "${options.filter}"`);
    return [];
  }

  const results: SingleRunResult[] = [];

  for (const item of targetEvals) {
    console.log(`  ▶ Running [${item.id}] (with_skill)...`);

    // 1. Run with_skill
    const withGen = await generateContent(item.prompt, {
      model: options.model,
      systemInstruction: skill.systemInstruction,
      mock: options.mock,
    });

    const withGrading = await gradeAssertions(withGen.text, item.expected_output, item.assertions, {
      model: options.model,
      mock: options.mock,
    });

    results.push({
      eval_id: item.id,
      config: 'with_skill',
      output: withGen.text,
      timing: withGen.timing,
      grading: withGrading,
    });

    // 2. Run without_skill if in comparison mode
    if (mode === 'comparison') {
      console.log(`  ▶ Running [${item.id}] (without_skill)...`);

      const withoutGen = await generateContent(item.prompt, {
        model: options.model,
        systemInstruction: undefined,
        mock: options.mock,
      });

      const withoutGrading = await gradeAssertions(withoutGen.text, item.expected_output, item.assertions, {
        model: options.model,
        mock: options.mock,
      });

      results.push({
        eval_id: item.id,
        config: 'without_skill',
        output: withoutGen.text,
        timing: withoutGen.timing,
        grading: withoutGrading,
      });
    }
  }

  return results;
}
