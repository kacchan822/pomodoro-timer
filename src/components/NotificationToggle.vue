<script setup lang="ts">
import { requestPermission } from '../services/NotificationService';

interface NotificationToggleProps {
  modelValue: boolean;
}

const props = defineProps<NotificationToggleProps>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

async function handleToggle(): Promise<void> {
  const enabling = !props.modelValue;

  if (enabling) {
    // 初回クリック時（permission が 'default'）に許可を要求する（要件 5.3）
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await requestPermission();
      // 拒否された場合はトグルをオフのまま保つ（要件 5.4）
      if (permission === 'denied') {
        return;
      }
    }
    // すでに denied の場合も有効化しない
    if ('Notification' in window && Notification.permission === 'denied') {
      return;
    }
  }

  emit('update:modelValue', enabling);
}
</script>

<template>
  <div :class="$style.wrapper">
    <button
      type="button"
      role="switch"
      :aria-checked="props.modelValue"
      :aria-label="props.modelValue ? '通知を無効にする' : '通知を有効にする'"
      :class="[$style.toggle, props.modelValue ? $style.toggleOn : $style.toggleOff]"
      @click="handleToggle"
    >
      <span :class="$style.thumb" />
    </button>
    <span :class="$style.label" aria-hidden="true">通知</span>
  </div>
</template>

<style module>
.wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-size: 0.875rem;
  user-select: none;
}

.toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 2.75rem;
  height: 1.5rem;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  padding: 0.125rem;
  transition: background-color 0.2s ease;
}

.toggle:focus-visible {
  outline: 3px solid #4f8ef7;
  outline-offset: 2px;
}

.toggleOn {
  background-color: #4f8ef7;
}

.toggleOff {
  background-color: #ccc;
}

.thumb {
  display: block;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.toggleOn .thumb {
  transform: translateX(1.25rem);
}

.toggleOff .thumb {
  transform: translateX(0);
}
</style>
