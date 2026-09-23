// Feature: pomodoro-timer, Property 12: 設定の永続化ラウンドトリップ
// Feature: pomodoro-timer, Property 13: 統計の日付リセット不変条件
//
// 要件 4.1: 起動時に Storage から Settings を読み込み、保存済みなら初期値に使う。
// 要件 4.2: Storage に Settings が無ければデフォルト値を使う。
// 要件 6.4: 起動時に Storage から Statistics を読み込み、当日の日付なら保存値を使う。
// 要件 6.5: Storage の Statistics が前日以前の日付なら当日のカウントを 0 にリセットする。

import * as fc from 'fast-check';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadSettings,
  saveSettings,
  loadStatistics,
  saveStatistics,
} from '../../lib/storage';
import { getTodayString } from '../../lib/date';
import { DEFAULT_SETTINGS } from '../../types';
import type { Settings, Statistics } from '../../types';

/** 合法な Settings を生成するアービトラリ */
const validSettingsArb = fc.record<Settings>({
  sessionMinutes: fc.integer({ min: 1, max: 60 }),
  shortBreakMinutes: fc.integer({ min: 1, max: 30 }),
  longBreakMinutes: fc.integer({ min: 1, max: 60 }),
  sessionsPerCycle: fc.integer({ min: 1, max: 8 }),
  notificationsEnabled: fc.boolean(),
});

/** 今日より前の YYYY-MM-DD 形式の日付文字列を生成するアービトラリ（1〜3650 日前） */
const pastDateStringArb = fc.integer({ min: 1, max: 3650 }).map((daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

// ---------------------------------------------------------------------------
// Property 12: 設定の永続化ラウンドトリップ
// Validates: Requirements 4.1, 4.2
// ---------------------------------------------------------------------------
describe('Property 12: loadSettings / saveSettings persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('saveSettings(s) の後 loadSettings() は s と深く等しい（ラウンドトリップ）', () => {
    fc.assert(
      fc.property(validSettingsArb, (settings) => {
        localStorage.clear();
        saveSettings(settings);
        const loaded = loadSettings();
        expect(loaded).toEqual(settings);
      }),
      { numRuns: 100 },
    );
  });

  test('ストレージが空のときはどのように呼んでも DEFAULT_SETTINGS を返す', () => {
    // 要件 4.2: 保存済みが無ければ常にデフォルト値
    fc.assert(
      fc.property(fc.constant(null), () => {
        localStorage.clear();
        const loaded = loadSettings();
        expect(loaded).toEqual(DEFAULT_SETTINGS);
      }),
      { numRuns: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: 統計の日付リセット不変条件
// Validates: Requirements 6.4, 6.5
// ---------------------------------------------------------------------------
describe('Property 13: loadStatistics date-reset invariant', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('保存日付が今日ならどんな todayCount でもそのまま読み込まれる', () => {
    // 要件 6.4
    fc.assert(
      fc.property(fc.nat({ max: 10000 }), (count) => {
        localStorage.clear();
        const stats: Statistics = { date: getTodayString(), todayCount: count };
        saveStatistics(stats);

        const loaded = loadStatistics();
        expect(loaded.date).toBe(getTodayString());
        expect(loaded.todayCount).toBe(count);
      }),
      { numRuns: 100 },
    );
  });

  test('保存日付が前日以前なら todayCount は必ず 0 にリセットされ、日付は今日になる', () => {
    // 要件 6.5
    fc.assert(
      fc.property(pastDateStringArb, fc.integer({ min: 1, max: 10000 }), (pastDate, count) => {
        localStorage.clear();
        const stale: Statistics = { date: pastDate, todayCount: count };
        saveStatistics(stale);

        const loaded = loadStatistics();
        expect(loaded.todayCount).toBe(0);
        expect(loaded.date).toBe(getTodayString());
      }),
      { numRuns: 100 },
    );
  });
});
