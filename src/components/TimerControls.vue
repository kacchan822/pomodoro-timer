<script setup lang="ts">
interface TimerControlsProps {
  isRunning: boolean;
}

const props = defineProps<TimerControlsProps>();

const emit = defineEmits<{
  start: [];
  pause: [];
  reset: [];
}>();
</script>

<template>
  <div :class="$style.controls">
    <button
      v-if="!props.isRunning"
      type="button"
      :class="$style.btn"
      aria-label="スタート"
      @click="emit('start')"
    >
      スタート
    </button>
    <button
      v-else
      type="button"
      :class="$style.btn"
      aria-label="一時停止"
      @click="emit('pause')"
    >
      一時停止
    </button>
    <button
      type="button"
      :class="[$style.btn, $style.btnReset]"
      aria-label="リセット"
      @click="emit('reset')"
    >
      リセット
    </button>
  </div>
</template>

<style module>
.controls {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
}

.btn {
  padding: 0.5rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  border: 2px solid currentColor;
  border-radius: 0.375rem;
  cursor: pointer;
  background-color: transparent;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.btn:focus-visible {
  outline: 3px solid #4f8ef7;
  outline-offset: 2px;
}

.btnReset {
  color: #888;
}
</style>
