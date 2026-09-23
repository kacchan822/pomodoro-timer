<script setup lang="ts">
import { ref, computed } from 'vue'
import { validateSettings } from '../lib/validation'
import type { Settings } from '../types'

interface SettingsFormProps {
  currentSettings: Settings
}

const props = defineProps<SettingsFormProps>()

const emit = defineEmits<{
  save: [settings: Settings]
}>()

/**
 * フォームの下書き状態。親から受け取った currentSettings で初期化し、
 * ユーザーの入力をここで保持する。
 */
const draft = ref<Settings>({ ...props.currentSettings })

/**
 * リアルタイムバリデーション。draft が変わるたびに再計算される。
 */
const validationResult = computed(() => validateSettings(draft.value))

/**
 * 保存ボタンが押されたとき、draft の内容を emit する。
 * バリデーションエラーがある場合はボタン自体が disabled なので
 * ここに到達することはないが、念のためガードする。
 */
function handleSubmit(): void {
  if (!validationResult.value.valid) return
  emit('save', { ...draft.value })
}

/**
 * number 型入力の onChange ハンドラ。
 * input の値は文字列として来るため parseInt で変換する。
 * NaN になった場合は 0 にして後続のバリデーションに任せる。
 */
function parseIntInput(value: string): number {
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? 0 : n
}
</script>

<template>
  <form :class="$style.form" @submit.prevent="handleSubmit" novalidate>
    <h2 :class="$style.heading">設定</h2>

    <!-- 作業セッション時間 -->
    <div :class="$style.field">
      <label :class="$style.label" for="sessionMinutes">
        作業時間（分）
      </label>
      <input
        id="sessionMinutes"
        type="number"
        :class="[
          $style.input,
          !validationResult.valid && validationResult.errors.sessionMinutes
            ? $style.inputError
            : '',
        ]"
        :value="draft.sessionMinutes"
        min="1"
        max="60"
        aria-describedby="sessionMinutes-error"
        @input="draft.sessionMinutes = parseIntInput(($event.target as HTMLInputElement).value)"
      />
      <p
        v-if="!validationResult.valid && validationResult.errors.sessionMinutes"
        id="sessionMinutes-error"
        :class="$style.errorMessage"
        role="alert"
      >
        {{ validationResult.errors.sessionMinutes }}
      </p>
    </div>

    <!-- 短い休憩時間 -->
    <div :class="$style.field">
      <label :class="$style.label" for="shortBreakMinutes">
        短い休憩（分）
      </label>
      <input
        id="shortBreakMinutes"
        type="number"
        :class="[
          $style.input,
          !validationResult.valid && validationResult.errors.shortBreakMinutes
            ? $style.inputError
            : '',
        ]"
        :value="draft.shortBreakMinutes"
        min="1"
        max="30"
        aria-describedby="shortBreakMinutes-error"
        @input="draft.shortBreakMinutes = parseIntInput(($event.target as HTMLInputElement).value)"
      />
      <p
        v-if="!validationResult.valid && validationResult.errors.shortBreakMinutes"
        id="shortBreakMinutes-error"
        :class="$style.errorMessage"
        role="alert"
      >
        {{ validationResult.errors.shortBreakMinutes }}
      </p>
    </div>

    <!-- 長い休憩時間 -->
    <div :class="$style.field">
      <label :class="$style.label" for="longBreakMinutes">
        長い休憩（分）
      </label>
      <input
        id="longBreakMinutes"
        type="number"
        :class="[
          $style.input,
          !validationResult.valid && validationResult.errors.longBreakMinutes
            ? $style.inputError
            : '',
        ]"
        :value="draft.longBreakMinutes"
        min="1"
        max="60"
        aria-describedby="longBreakMinutes-error"
        @input="draft.longBreakMinutes = parseIntInput(($event.target as HTMLInputElement).value)"
      />
      <p
        v-if="!validationResult.valid && validationResult.errors.longBreakMinutes"
        id="longBreakMinutes-error"
        :class="$style.errorMessage"
        role="alert"
      >
        {{ validationResult.errors.longBreakMinutes }}
      </p>
    </div>

    <!-- サイクルあたりセッション数 -->
    <div :class="$style.field">
      <label :class="$style.label" for="sessionsPerCycle">
        サイクルあたりのセッション数
      </label>
      <input
        id="sessionsPerCycle"
        type="number"
        :class="[
          $style.input,
          !validationResult.valid && validationResult.errors.sessionsPerCycle
            ? $style.inputError
            : '',
        ]"
        :value="draft.sessionsPerCycle"
        min="1"
        max="8"
        aria-describedby="sessionsPerCycle-error"
        @input="draft.sessionsPerCycle = parseIntInput(($event.target as HTMLInputElement).value)"
      />
      <p
        v-if="!validationResult.valid && validationResult.errors.sessionsPerCycle"
        id="sessionsPerCycle-error"
        :class="$style.errorMessage"
        role="alert"
      >
        {{ validationResult.errors.sessionsPerCycle }}
      </p>
    </div>

    <!-- 保存ボタン -->
    <div :class="$style.actions">
      <button
        type="submit"
        :class="$style.saveBtn"
        :disabled="!validationResult.valid"
        aria-label="設定を保存"
      >
        保存
      </button>
    </div>
  </form>
</template>

<style module>
.form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 24rem;
  width: 100%;
}

.heading {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f0f0f0;
  margin: 0 0 0.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #d4d4d4;
}

.input {
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  background-color: #1e1e2e;
  color: #f0f0f0;
  border: 2px solid #444;
  border-radius: 0.375rem;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: #4f8ef7;
}

.inputError {
  border-color: #f87171;
}

.inputError:focus {
  border-color: #f87171;
}

.errorMessage {
  font-size: 0.8125rem;
  color: #f87171;
  margin: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.saveBtn {
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  background-color: #4f8ef7;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.saveBtn:hover:not(:disabled) {
  background-color: #3a7de0;
}

.saveBtn:focus-visible {
  outline: 3px solid #4f8ef7;
  outline-offset: 2px;
}

.saveBtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
