<script setup lang="ts">
// SettingsPage.vue — 設定ページ
//
// - SettingsForm をラップし、useSettingsStore.saveSettingsAction に接続する（要件 3.5）
// - 設定保存後に useTimerStore.applySettings を呼んでタイマーをリセットする（要件 3.6）
// - localStorage アクセスエラー時に「設定が保存されません」バナーを 1 度だけ表示する（要件 4.3）
import { ref } from 'vue'
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsStore } from '../stores/settingsStore'
import { useTimerStore } from '../stores/timerStore'
import type { Settings } from '../types'

const settingsStore = useSettingsStore()
const timerStore = useTimerStore()

/**
 * localStorage アクセス不可バナーの表示フラグ。
 * 一度 true になると保存操作ごとに再表示することはあっても、
 * 「1 度だけ表示する」要件（4.3）を満たすため、
 * 一度でも表示したら二度と再評価しないようにする（showStorageBanner を再び false に戻さない）。
 */
const showStorageBanner = ref(false)

/**
 * バナーを既に一度表示したかどうか。
 * これが true の場合、以降のエラー検出でバナーを再度出さない。
 */
let bannerShownOnce = false

/**
 * localStorage が書き込み可能かどうかを判定する。
 * プライベートブラウジング制限や無効化された環境では例外が発生するため、
 * テスト用キーの書き込み・削除を試みて可否を返す。
 */
function isLocalStorageWritable(): boolean {
  try {
    const testKey = '__pomodoro_storage_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * SettingsForm から save イベントを受け取ったときの処理。
 *
 * 1. localStorage が書き込み可能かを判定し、不可なら「設定が保存されません」バナーを
 *    1 度だけ表示する（要件 4.3）。
 * 2. saveSettingsAction で検証・保存を行う（要件 3.5）。
 *    バリデーションは SettingsForm 側で担保されているが、ストア側でも再検証される。
 * 3. applySettings でタイマーをリセットし、新しい設定時間を反映する（要件 3.6）。
 */
function handleSave(settings: Settings): void {
  if (!isLocalStorageWritable() && !bannerShownOnce) {
    showStorageBanner.value = true
    bannerShownOnce = true
  }

  settingsStore.saveSettingsAction(settings)
  timerStore.applySettings(settings)
}
</script>

<template>
  <section :class="$style.page">
    <!-- localStorage アクセスエラーバナー（要件 4.3、1 度だけ表示） -->
    <p
      v-if="showStorageBanner"
      :class="$style.banner"
      role="alert"
    >
      設定が保存されません。ブラウザのストレージにアクセスできないため、この設定は次回起動時に失われます。
    </p>

    <SettingsForm
      :current-settings="settingsStore.settings"
      @save="handleSave"
    />
  </section>
</template>

<style module>
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
  width: 100%;
}

.banner {
  width: 100%;
  max-width: 24rem;
  box-sizing: border-box;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #fff;
  background-color: #b91c1c;
  border: 1px solid #f87171;
  border-radius: 0.375rem;
  margin: 0;
}
</style>
