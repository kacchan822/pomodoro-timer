// Feature: pomodoro-timer, Property 5: 設定のシリアライズ・デシリアライズ ラウンドトリップ
// Feature: pomodoro-timer, Property 6: 統計のシリアライズ・デシリアライズ ラウンドトリップ

import * as fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import {
  serializeSettings,
  deserializeSettings,
  serializeStatistics,
  deserializeStatistics,
} from '../../lib/storage';
import type { Settings, Statistics } from '../../types';

// ---------------------------------------------------------------------------
// Property 5: 設定のシリアライズ・デシリアライズ ラウンドトリップ
// Validates: Requirements 3.5, 4.3
// ---------------------------------------------------------------------------

/** 合法な Settings を生成するアービトラリ */
const validSettingsArb = fc.record<Settings>({
  sessionMinutes: fc.integer({ min: 1, max: 60 }),
  shortBreakMinutes: fc.integer({ min: 1, max: 30 }),
  longBreakMinutes: fc.integer({ min: 1, max: 60 }),
  sessionsPerCycle: fc.integer({ min: 1, max: 8 }),
  notificationsEnabled: fc.boolean(),
});

describe('Property 5: Settings serialize/deserialize round-trip', () => {
  test('deserializeSettings(serializeSettings(s)) deep-equals s', () => {
    fc.assert(
      fc.property(validSettingsArb, (settings) => {
        const result = deserializeSettings(serializeSettings(settings));
        expect(result).toEqual(settings);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: 統計のシリアライズ・デシリアライズ ラウンドトリップ
// Validates: Requirements 6.6
// ---------------------------------------------------------------------------

/** YYYY-MM-DD 形式の日付文字列を生成するアービトラリ */
const dateStringArb = fc
  .tuple(
    fc.integer({ min: 2000, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }), // max 28 to avoid month-length edge cases
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

/** Statistics を生成するアービトラリ */
const statisticsArb = fc.record<Statistics>({
  date: dateStringArb,
  todayCount: fc.nat({ max: 1000 }),
});

describe('Property 6: Statistics serialize/deserialize round-trip', () => {
  test('deserializeStatistics(serializeStatistics(st)) deep-equals st', () => {
    fc.assert(
      fc.property(statisticsArb, (stats) => {
        const result = deserializeStatistics(serializeStatistics(stats));
        expect(result).toEqual(stats);
      }),
      { numRuns: 100 },
    );
  });
});
