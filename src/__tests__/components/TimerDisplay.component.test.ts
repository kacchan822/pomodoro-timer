/**
 * TimerDisplay.vue コンポーネントテスト
 *
 * aria-live 領域が DOM に存在することを検証する。
 * Requirements: 8.1
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/vue';
import TimerDisplay from '../../components/TimerDisplay.vue';
import type { Phase } from '../../types';

const defaultProps = {
  phase: 'session' as Phase,
  secondsRemaining: 1500, // 25:00
  isRunning: false,
};

describe('TimerDisplay.vue - アクセシビリティ (要件 8.1)', () => {
  it('aria-live 領域が DOM に存在する', () => {
    const { container } = render(TimerDisplay, { props: defaultProps });

    const ariaLiveEl = container.querySelector('[aria-live]');
    expect(ariaLiveEl).not.toBeNull();
  });

  it('初期表示では aria-live 属性が "polite" に設定されている', () => {
    const { container } = render(TimerDisplay, { props: defaultProps });

    const ariaLiveEl = container.querySelector('[aria-live]');
    expect(ariaLiveEl?.getAttribute('aria-live')).toBe('polite');
  });

  it('aria-live 領域は各フェーズで存在し続ける', () => {
    const phases: Phase[] = ['session', 'shortBreak', 'longBreak'];

    for (const phase of phases) {
      const { container } = render(TimerDisplay, {
        props: { ...defaultProps, phase, secondsRemaining: 300 },
      });
      expect(container.querySelector('[aria-live]')).not.toBeNull();
    }
  });
});
