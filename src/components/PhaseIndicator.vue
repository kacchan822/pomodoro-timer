<script setup lang="ts">
import { computed } from 'vue';
import { getIndicatorStates } from '../lib/timer';

interface PhaseIndicatorProps {
  completedInCycle: number;
  sessionsPerCycle: number;
}

const props = defineProps<PhaseIndicatorProps>();

const states = computed(() =>
  getIndicatorStates(props.completedInCycle, props.sessionsPerCycle),
);

const ariaLabel = computed(
  () => `セッション ${props.completedInCycle}/${props.sessionsPerCycle} 完了`,
);
</script>

<template>
  <div :class="$style.container" :aria-label="ariaLabel" role="img">
    <span
      v-for="(done, index) in states"
      :key="index"
      :class="[$style.dot, done ? $style.dotCompleted : $style.dotPending]"
      aria-hidden="true"
    >{{ done ? '◉' : '○' }}</span>
  </div>
</template>

<style module>
.container {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
}

.dot {
  font-size: 1.25rem;
  line-height: 1;
  transition: color 0.2s ease;
}

.dotCompleted {
  color: var(--color-accent, #e05c4b);
}

.dotPending {
  color: var(--color-muted, #9b9b9b);
}
</style>
