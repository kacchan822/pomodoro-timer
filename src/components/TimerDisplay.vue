<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatTime } from '../lib/timer'
import type { Phase } from '../types'

interface TimerDisplayProps {
  phase: Phase
  secondsRemaining: number
  isRunning: boolean
}

const props = defineProps<TimerDisplayProps>()

/**
 * フェーズの日本語ラベル
 */
const PHASE_LABELS: Record<Phase, string> = {
  session: '作業中',
  shortBreak: '短い休憩',
  longBreak: '長い休憩',
}

const phaseLabel = computed(() => PHASE_LABELS[props.phase])
const formattedTime = computed(() => formatTime(props.secondsRemaining))

/**
 * aria-live レベルの制御
 * フェーズが切り替わった瞬間だけ 'assertive' にし、次の tick で 'polite' へ戻す。
 * これにより、フェーズ変更はスクリーンリーダーが割り込み読み上げし、
 * 通常のカウントダウンは polite で読み上げ（または無視）される。
 */
const ariaLive = ref<'polite' | 'assertive'>('polite')

watch(
  () => props.phase,
  () => {
    ariaLive.value = 'assertive'
    // 次の tick で polite に戻す
    setTimeout(() => {
      ariaLive.value = 'polite'
    }, 0)
  },
)
</script>

<template>
  <div :class="$style.container">
    <!-- フェーズ名ラベル -->
    <p :class="$style.phaseLabel">{{ phaseLabel }}</p>

    <!-- タイマー表示 + aria-live 領域 -->
    <div
      :aria-live="ariaLive"
      :aria-label="`残り時間 ${formattedTime}、${phaseLabel}`"
      :class="$style.timerDisplay"
    >
      <span :class="$style.time">{{ formattedTime }}</span>
    </div>
  </div>
</template>

<style module>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.phaseLabel {
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #c084fc;
}

.timerDisplay {
  display: flex;
  align-items: center;
  justify-content: center;
}

.time {
  font-size: 6rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1;
  color: #f0f0f0;
}
</style>
