/**
 * ストレージ関連ユニットテスト
 * loadSettings / loadStatistics の振る舞いを検証する
 */

import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadSettings, loadStatistics } from '../../lib/storage';
import { DEFAULT_SETTINGS } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 昨日の日付を "YYYY-MM-DD" 形式で返す */
function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 今日の日付を "YYYY-MM-DD" 形式で返す（storage.ts の getTodayString と同じロジック） */
function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// loadSettings
// ---------------------------------------------------------------------------

describe('loadSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('ストレージが空の場合は DEFAULT_SETTINGS を返す', () => {
    // localStorage は beforeEach でクリア済み — getItem は null を返す
    const result = loadSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('保存済みデータがある場合はその値を返す', () => {
    const customSettings = {
      sessionMinutes: 30,
      shortBreakMinutes: 10,
      longBreakMinutes: 20,
      sessionsPerCycle: 3,
      notificationsEnabled: false,
    };
    // 実際の localStorage に書き込む
    localStorage.setItem('pomodoro-settings', JSON.stringify(customSettings));

    const result = loadSettings();

    expect(result).toEqual(customSettings);
  });

  it('localStorage.getItem が例外を投げる場合は DEFAULT_SETTINGS を返す', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    const result = loadSettings();

    expect(result).toEqual(DEFAULT_SETTINGS);
  });
});

// ---------------------------------------------------------------------------
// loadStatistics
// ---------------------------------------------------------------------------

describe('loadStatistics', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('ストレージが空の場合は今日の日付で todayCount: 0 を返す', () => {
    // localStorage は beforeEach でクリア済み
    const result = loadStatistics();

    expect(result.todayCount).toBe(0);
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('前日以前の日付の場合は todayCount を 0 にリセットして返す', () => {
    const staleStats = {
      date: getYesterdayString(),
      todayCount: 5,
    };
    localStorage.setItem('pomodoro-statistics', JSON.stringify(staleStats));

    const result = loadStatistics();

    expect(result.todayCount).toBe(0);
    // date が今日に更新されていること
    expect(result.date).not.toBe(staleStats.date);
    expect(result.date).toBe(getTodayString());
  });

  it('当日の日付の場合は保存済みの todayCount を返す', () => {
    const todayStats = {
      date: getTodayString(),
      todayCount: 7,
    };
    localStorage.setItem('pomodoro-statistics', JSON.stringify(todayStats));

    const result = loadStatistics();

    expect(result.todayCount).toBe(7);
    expect(result.date).toBe(getTodayString());
  });

  it('localStorage.getItem が例外を投げる場合は todayCount: 0 を返す', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    const result = loadStatistics();

    expect(result.todayCount).toBe(0);
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
