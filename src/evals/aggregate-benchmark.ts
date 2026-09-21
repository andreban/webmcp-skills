// Copyright 2026 Andre Cipriani Bandarra
// SPDX-License-Identifier: Apache-2.0

import type {
  BenchmarkReport,
  BenchmarkSummary,
  ConfigStats,
  DeltaStats,
  EvalBenchmarkResult,
  MetricStats,
  SingleRunResult,
} from './types.js';

/**
 * Calculates mean, stddev, min, and max for a list of numerical values.
 */
export function calculateStats(values: number[]): MetricStats {
  if (!values || values.length === 0) {
    return { mean: 0, stddev: 0, min: 0, max: 0 };
  }

  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;

  let stddev = 0;
  if (n > 1) {
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
    stddev = Math.sqrt(variance);
  }

  return {
    mean: Number(mean.toFixed(4)),
    stddev: Number(stddev.toFixed(4)),
    min: Number(Math.min(...values).toFixed(4)),
    max: Number(Math.max(...values).toFixed(4)),
  };
}

/**
 * Computes ConfigStats (pass_rate, time_seconds, tokens) for a list of runs.
 */
export function computeConfigStats(runs: SingleRunResult[]): ConfigStats {
  const passRates = runs.map((r) => r.grading.summary.pass_rate);
  const durationsSec = runs.map((r) => r.timing.duration_ms / 1000);
  const tokenCounts = runs.map((r) => r.timing.total_tokens);

  return {
    pass_rate: calculateStats(passRates),
    time_seconds: calculateStats(durationsSec),
    tokens: calculateStats(tokenCounts),
  };
}

/**
 * Computes DeltaStats between with_skill and without_skill configurations.
 */
export function computeDelta(withSkill: ConfigStats, withoutSkill: ConfigStats): DeltaStats {
  return {
    pass_rate: Number((withSkill.pass_rate.mean - withoutSkill.pass_rate.mean).toFixed(4)),
    time_seconds: Number((withSkill.time_seconds.mean - withoutSkill.time_seconds.mean).toFixed(4)),
    tokens: Math.round(withSkill.tokens.mean - withoutSkill.tokens.mean),
  };
}

/**
 * Aggregates all runs into a BenchmarkReport adhering to agentskills.io standard.
 */
export function buildBenchmarkReport(
  skillName: string,
  iteration: number,
  runs: SingleRunResult[],
): BenchmarkReport {
  const withSkillRuns = runs.filter((r) => r.config === 'with_skill');
  const withoutSkillRuns = runs.filter((r) => r.config === 'without_skill');

  const withSkillStats = computeConfigStats(withSkillRuns);
  const withoutSkillStats = withoutSkillRuns.length > 0 ? computeConfigStats(withoutSkillRuns) : undefined;
  const delta = withoutSkillStats ? computeDelta(withSkillStats, withoutSkillStats) : undefined;

  const runSummary: BenchmarkSummary = {
    with_skill: withSkillStats,
    without_skill: withoutSkillStats,
    delta,
  };

  // Group by eval_id for per-eval breakdown
  const evalIds = Array.from(new Set(runs.map((r) => r.eval_id)));
  const evalResults: EvalBenchmarkResult[] = [];

  for (const id of evalIds) {
    const withRun = withSkillRuns.find((r) => r.eval_id === id);
    const withoutRun = withoutSkillRuns.find((r) => r.eval_id === id);

    if (withRun) {
      const withSummary = {
        passed: withRun.grading.summary.failed === 0,
        pass_rate: withRun.grading.summary.pass_rate,
        time_seconds: Number((withRun.timing.duration_ms / 1000).toFixed(2)),
        tokens: withRun.timing.total_tokens,
      };

      let withoutSummary: EvalBenchmarkResult['without_skill'] = undefined;
      let deltaPassRate: number | undefined = undefined;

      if (withoutRun) {
        withoutSummary = {
          passed: withoutRun.grading.summary.failed === 0,
          pass_rate: withoutRun.grading.summary.pass_rate,
          time_seconds: Number((withoutRun.timing.duration_ms / 1000).toFixed(2)),
          tokens: withoutRun.timing.total_tokens,
        };
        deltaPassRate = Number((withSummary.pass_rate - withoutSummary.pass_rate).toFixed(4));
      }

      evalResults.push({
        id,
        with_skill: withSummary,
        without_skill: withoutSummary,
        delta_pass_rate: deltaPassRate,
      });
    }
  }

  return {
    skill_name: skillName,
    iteration,
    timestamp: new Date().toISOString(),
    run_summary: runSummary,
    eval_results: evalResults,
  };
}
