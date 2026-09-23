<script setup lang="ts">
interface StatisticsPanelProps {
  todayCount: number
}

defineProps<StatisticsPanelProps>()
</script>

<template>
  <section :class="$style.panel" aria-label="今日の統計">
    <p :class="$style.label">今日の完了セッション</p>
    <p :class="$style.count" aria-live="polite">
      <span :class="$style.number">{{ todayCount }}</span>
      <span :class="$style.unit">セッション</span>
    </p>
  </section>
</template>

<style module>
.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #a0a0b0;
  letter-spacing: 0.03em;
}

.count {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

.number {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #c084fc;
  line-height: 1;
}

.unit {
  font-size: 0.875rem;
  color: #a0a0b0;
}
</style>
