/**
 * TimerDisplay.vue コンポーネントテスト
 *
 * aria-live 領域の存在、フォーマット済み時間表示、フェーズラベル表示を検証する
 * Requirements: 8.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/vue';
import { createPinia } from 'pinia';
import TimerDisplay from '../../components/TimerDisplay.vue';

describe('TimerDisplay.vue', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
  });

  const defaultProps = {
    phase: 'session' as const,
    secondsRemaining: 1500, // 25:00
    isRunning: false,
  };

  it('aria-live 領域が DOM に存在する（要件 8.1）', () => {
    const { container } = render(TimerDisplay, {
      props: defaultProps,
      global: { plugins: [pinia] },
    });

    const ariaLiveEl = container.querySelector('[aria-live]');
    expect(ariaLiveEl).not.toBeNull();
  });

  it('初期表示では aria-live は "polite" に設定されている（要件 8.1）', () => {
    const { container } = render(TimerDisplay, {
      props: defaultProps,
      global: { plugins: [pinia] },
    });

    const ariaLiveEl = container.querySelector('[aria-live]');
    expect(ariaLiveEl?.getAttribute('aria-live')).toBe('polite');
  });

  it('残り時間が MM:SS 形式で表示される（要件 1.1）', () => {
    const { getByText } = render(TimerDisplay, {
      props: defaultProps,
      global: { plugins: [pinia] },
    });

    expect(getByText('25:00')).toBeTruthy();
  });

  it('フェーズラベル "作業中" が表示される（要件 2.5）', () => {
    const { getByText } = render(TimerDisplay, {
      props: defaultProps,
      global: { plugins: [pinia] },
    });

    expect(getByText('作業中')).toBeTruthy();
  });

  it('shortBreak フェーズでは "短い休憩" が表示される', () => {
    const { getByText } = render(TimerDisplay, {
      props: { phase: 'shortBreak' as const, secondsRemaining: 300, isRunning: false },
      global: { plugins: [pinia] },
    });

    expect(getByText('短い休憩')).toBeTruthy();
    expect(getByText('05:00')).toBeTruthy();
  });

  it('longBreak フェーズでは "長い休憩" が表示される', () => {
    const { getByText } = render(TimerDisplay, {
      props: { phase: 'longBreak' as const, secondsRemaining: 900, isRunning: false },
      global: { plugins: [pinia] },
    });

    expect(getByText('長い休憩')).toBeTruthy();
    expect(getByText('15:00')).toBeTruthy();
  });

  it('aria-label に残り時間とフェーズ名が含まれる（要件 8.1）', () => {
    const { container } = render(TimerDisplay, {
      props: defaultProps,
      global: { plugins: [pinia] },
    });

    const ariaLiveEl = container.querySelector('[aria-live]');
    const ariaLabel = ariaLiveEl?.getAttribute('aria-label') ?? '';
    expect(ariaLabel).toContain('25:00');
    expect(ariaLabel).toContain('作業中');
  });
});
