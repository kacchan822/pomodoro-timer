<script setup lang="ts">
// TimerPage.vue — タイマー画面
// PhaseIndicator / TimerDisplay / TimerControls / StatisticsPanel / NotificationToggle
// を組み合わせ、useTimerStore / useSettingsStore / useStatisticsStore を接続する。
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import PhaseIndicator from '../components/PhaseIndicator.vue'
import TimerDisplay from '../components/TimerDisplay.vue'
import TimerControls from '../components/TimerControls.vue'
import StatisticsPanel from '../components/StatisticsPanel.vue'
import NotificationToggle from '../components/NotificationToggle.vue'
import { useTimerStore } from '../stores/timerStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useStatisticsStore } from '../stores/statisticsStore'
import type { Settings } from '../types'

const timerStore = useTimerStore()
const settingsStore = useSettingsStore()
const statisticsStore = useStatisticsStore()

// タイマーのリアクティブな状態（要件 1.1, 1.6, 2.5, 2.6）
const { phase, secondsRemaining, isRunning, completedInCycle } =
  storeToRefs(timerStore)

// 設定・統計のリアクティブな状態
const { settings } = storeToRefs(settingsStore)
const { todayCount } = storeToRefs(statisticsStore)

// 1 サイクルあたりのセッション数（インジケーター用、要件 2.6）
const sessionsPerCycle = computed(() => settings.value.sessionsPerCycle)

// 通知の有効・無効（要件 5.3）
const notificationsEnabled = computed({
  get: () => settings.value.notificationsEnabled,
  set: (value: boolean) => {
    const updated: Settings = {
      ...settings.value,
      notificationsEnabled: value,
    }
    settingsStore.saveSettingsAction(updated)
  },
})
</script>

<template>
  <div :class="$style.page">
    <header :class="$style.header">
      <NotificationToggle v-model="notificationsEnabled" />
    </header>

    <main :class="$style.main">
      <!-- サイクル内のセッション進捗（要件 2.6） -->
      <PhaseIndicator
        :completed-in-cycle="completedInCycle"
        :sessions-per-cycle="sessionsPerCycle"
      />

      <!-- 現在フェーズと残り時間（要件 1.1, 2.5） -->
      <TimerDisplay
        :phase="phase"
        :seconds-remaining="secondsRemaining"
        :is-running="isRunning"
      />

      <!-- スタート・一時停止・リセット（要件 1.2, 1.3, 1.4, 1.5） -->
      <TimerControls
        :is-running="isRunning"
        @start="timerStore.start"
        @pause="timerStore.pause"
        @reset="timerStore.reset"
      />

      <!-- 当日の完了セッション数（要件 6.2） -->
      <StatisticsPanel :today-count="todayCount" />
    </main>
  </div>
</template>

<style module>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  gap: 2rem;
}

.header {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 0;
}

.main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.5rem;
  flex: 1;
  justify-content: center;
}
</style>
