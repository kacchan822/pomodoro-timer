import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { Settings } from '../types';
import { loadSettings, saveSettings } from '../lib/storage';
import { validateSettings } from '../lib/validation';

/**
 * 設定ストア
 *
 * - 起動時に localStorage から設定を読み込む（失敗時は DEFAULT_SETTINGS を使用）
 * - `saveSettingsAction` で検証後に設定を保存・更新する
 */
export const useSettingsStore = defineStore('settings', () => {
  // state — 起動時に localStorage から読み込んで初期化
  const settings = ref<Settings>(loadSettings());

  /**
   * 設定を検証して保存する。
   * バリデーションが通った場合のみ localStorage への書き込みと ref の更新を行う。
   * バリデーションエラーがある場合は何もしない（呼び出し側が ValidationResult を確認する）。
   *
   * @param s - 保存する設定値
   */
  function saveSettingsAction(s: Settings): void {
    const result = validateSettings(s);
    if (!result.valid) {
      // 無効な設定は保存しない（要件 3.7）
      return;
    }
    saveSettings(s);
    settings.value = { ...s };
  }

  return {
    settings,
    saveSettingsAction,
  };
});
