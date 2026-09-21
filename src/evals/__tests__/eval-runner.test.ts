// Copyright 2026 Andre Cipriani Bandarra
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateStats, computeDelta } from '../aggregate-benchmark.js';
import { gradeAssertions, tryDeterministicCheck } from '../grader.js';
import { discoverSkills, loadSkillEvals, validateEvalItem } from '../loader.js';
import { packageSkill } from '../package-skill.js';
import { runTriggerEval } from '../trigger-eval.js';
import type { ConfigStats, EvalCase } from '../types.js';
import { validateSkill } from '../validate-skill.js';

describe('Eval Runner - Loader', () => {
  it('discovers skills in skills directory', () => {
    const skills = discoverSkills(path.resolve('skills'));
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.some((s) => s.name === 'build-webmcp-tools')).toBe(true);
  });

  it('loads modular suites for build-webmcp-tools', () => {
    const skill = loadSkillEvals(path.resolve('skills/build-webmcp-tools'));
    expect(skill.name).toBe('build-webmcp-tools');
    expect(skill.evals.length).toBe(25);
    expect(skill.suites).toContain('stage-0-router');
    expect(skill.suites).toContain('stage-6-frameworks');
    expect(skill.suites).toContain('core-principles');
  });

  it('validates eval cases according to agentskills schema', () => {
    const validCase: EvalCase = {
      id: 'test-case-1',
      prompt: 'Do something',
      expected_output: 'Expected output',
      assertions: ['The output includes something'],
    };

    expect(() => validateEvalItem(validCase, 'test.json', process.cwd())).not.toThrow();

    const invalidCase = {
      id: 'bad-case',
      prompt: 'Do something',
      // missing expected_output
      assertions: [],
    };
    expect(() => validateEvalItem(invalidCase, 'bad.json', process.cwd())).toThrow();
  });
});

describe('Eval Runner - Aggregate Benchmark', () => {
  it('calculates mean, stddev, min, max correctly', () => {
    const stats = calculateStats([1.0, 0.5, 0.75]);
    expect(stats.mean).toBe(0.75);
    expect(stats.min).toBe(0.5);
    expect(stats.max).toBe(1.0);
    expect(stats.stddev).toBeGreaterThan(0);
  });

  it('handles empty and single-value lists', () => {
    expect(calculateStats([])).toEqual({ mean: 0, stddev: 0, min: 0, max: 0 });
    expect(calculateStats([0.8])).toEqual({ mean: 0.8, stddev: 0, min: 0.8, max: 0.8 });
  });

  it('computes delta between with_skill and without_skill', () => {
    const withSkill: ConfigStats = {
      pass_rate: { mean: 0.9, stddev: 0.1, min: 0.8, max: 1.0 },
      time_seconds: { mean: 2.5, stddev: 0.3, min: 2.0, max: 3.0 },
      tokens: { mean: 1200, stddev: 100, min: 1000, max: 1400 },
    };
    const withoutSkill: ConfigStats = {
      pass_rate: { mean: 0.4, stddev: 0.2, min: 0.2, max: 0.6 },
      time_seconds: { mean: 2.0, stddev: 0.2, min: 1.8, max: 2.2 },
      tokens: { mean: 800, stddev: 80, min: 700, max: 900 },
    };

    const delta = computeDelta(withSkill, withoutSkill);
    expect(delta.pass_rate).toBe(0.5);
    expect(delta.time_seconds).toBe(0.5);
    expect(delta.tokens).toBe(400);
  });
});

describe('Eval Runner - Grader', () => {
  it('evaluates deterministic negative assertions', async () => {
    const goodOutput = 'import { useWebMCP } from "use-webmcp-tool";';
    const badOutput = 'import { modelContext } from "navigator.modelContext";';

    const assertions = ['The output does NOT include navigator.modelContext'];

    const goodResult = await gradeAssertions(goodOutput, 'expected', assertions);
    expect(goodResult.summary.passed).toBe(1);
    expect(goodResult.assertion_results[0].passed).toBe(true);
    expect(goodResult.assertion_results[0].evidence).toContain('does not appear');

    const badResult = await gradeAssertions(badOutput, 'expected', assertions);
    expect(badResult.summary.failed).toBe(1);
    expect(badResult.assertion_results[0].passed).toBe(false);
  });

  it('evaluates deterministic positive inclusion assertions', async () => {
    const output = 'const config = { readOnlyHint: true };';
    const assertions = ['The output includes readOnlyHint: true'];

    const result = await gradeAssertions(output, 'expected', assertions);
    expect(result.summary.passed).toBe(1);
    expect(result.assertion_results[0].passed).toBe(true);
  });

  it('distinguishes deterministic tokens from semantic descriptive assertions', () => {
    const output = '<form toolname="search" toolautosubmit>';

    // Quoted token
    const quoted = tryDeterministicCheck("The output includes 'toolname'", output);
    expect(quoted).not.toBeNull();
    expect(quoted?.passed).toBe(true);

    // Key-value pair
    const kv = tryDeterministicCheck('The output includes readOnlyHint: true', 'readOnlyHint: true');
    expect(kv).not.toBeNull();
    expect(kv?.passed).toBe(true);

    // Multi-word descriptive sentence must fall through (return null) for semantic evaluation
    const descriptive1 = tryDeterministicCheck('The output includes the toolname attribute on the form', output);
    expect(descriptive1).toBeNull();

    const descriptive2 = tryDeterministicCheck(
      'The output includes AbortController or signal lifecycle management',
      output,
    );
    expect(descriptive2).toBeNull();
  });
});

describe('Skill Authoring - Validation & Packaging', () => {
  it('validates build-webmcp-tools skill directory', () => {
    const res = validateSkill(path.resolve('skills/build-webmcp-tools'));
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('validates skill-creator meta-skill directory', () => {
    const res = validateSkill(path.resolve('.agents/skills/skill-creator'));
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('packages skill into .skill zip archive excluding evals', () => {
    const testOutDir = path.resolve('node_modules/.cache/test-pack');
    const res = packageSkill('skills/build-webmcp-tools', testOutDir);
    expect(res.success).toBe(true);
    expect(res.archivePath).toBeDefined();
    expect(fs.existsSync(res.archivePath!)).toBe(true);

    // Clean up test archive
    if (res.archivePath && fs.existsSync(res.archivePath)) {
      fs.unlinkSync(res.archivePath);
    }
  });
});

describe('Skill Authoring - Trigger Evaluation', () => {
  it('evaluates trigger queries and computes precision, recall, and F1', async () => {
    const queries = [
      { query: 'Build WebMCP tools for my React application', should_trigger: true },
      { query: 'How do I cook homemade spaghetti carbonara?', should_trigger: false },
    ];

    const report = await runTriggerEval('build-webmcp-tools', 'WebMCP tools design', queries, {
      mock: true,
    });

    expect(report.metrics.total).toBe(2);
    expect(report.metrics.passed).toBe(2);
    expect(report.metrics.accuracy).toBe(1.0);
    expect(report.metrics.precision).toBe(1.0);
    expect(report.metrics.recall).toBe(1.0);
    expect(report.metrics.f1).toBe(1.0);
  });
});
