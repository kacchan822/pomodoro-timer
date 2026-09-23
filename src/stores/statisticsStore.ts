import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { Statistics } from '../types';
import { loadStatistics, saveStatistics } from '../lib/storage';
import { getTodayString } from '../lib/date';

/**
 * 統計ストア
 *
 * - 起動時に localStorage から統計を読み込む
 *   - `loadStatistics()` が前日以前のデータを検出した場合は todayCount: 0 で返す（要件 6.5）
 * - `incrementToday()` で当日の完了セッション数を加算して localStorage に保存する
 */
export const useStatisticsStore = defineStore('statistics', () => {
  // 起動時に localStorage から読み込む（stale-date リセットは loadStatistics() が担う）
  const loaded = loadStatistics();

  /** 当日の完了セッション数（要件 6.1, 6.2） */
  const todayCount = ref<number>(loaded.todayCount);

  /**
   * 当日の完了セッション数を 1 加算し、localStorage に保存する（要件 6.3, 6.6）
   */
  function incrementToday(): void {
    todayCount.value += 1;

    const stats: Statistics = {
      date: getTodayString(),
      todayCount: todayCount.value,
    };
    saveStatistics(stats);
  }

  return {
    todayCount,
    incrementToday,
  };
});
