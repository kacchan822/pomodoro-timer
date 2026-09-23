/**
 * TimerDisplay.vue コンポーネントテスト
 *
 * aria-live 領域の存在、フォーマット済み時間表示、フェーズラベル表示を検証する。
 * （旧 TimerDisplay.component.test.ts を統合済み）
 * Requirements: 1.1, 2.5, 8.1
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/vue';
import TimerDisplay from '../../components/TimerDisplay.vue';
import type { Phase } from '../../types';

// TimerDisplay は props 駆動で Pinia に依存しないため、plugins は不要。
const defaultProps = {
  phase: 'session' as Phase,
  secondsRemaining: 1500, // 25:00
  isRunning: false,
};

describe('TimerDisplay.vue', () => {
  describe('アクセシビリティ / aria-live（要件 8.1）', () => {
    it('aria-live 領域が DOM に存在する', () => {
      const { container } = render(TimerDisplay, { props: defaultProps });

      const ariaLiveEl = container.querySelector('[aria-live]');
      expect(ariaLiveEl).not.toBeNull();
    });

    it('初期表示では aria-live は "polite" に設定されている', () => {
      const { container } = render(TimerDisplay, { props: defaultProps });

      const ariaLiveEl = container.querySelector('[aria-live]');
      expect(ariaLiveEl?.getAttribute('aria-live')).toBe('polite');
    });

    it('aria-live 領域は各フェーズで存在し続ける', () => {
      const phases: Phase[] = ['session', 'shortBreak', 'longBreak'];

      for (const phase of phases) {
        const { container, unmount } = render(TimerDisplay, {
          props: { ...defaultProps, phase, secondsRemaining: 300 },
        });
        expect(container.querySelector('[aria-live]')).not.toBeNull();
        unmount();
      }
    });

    it('aria-label に残り時間とフェーズ名が含まれる', () => {
      const { container } = render(TimerDisplay, { props: defaultProps });

      const ariaLiveEl = container.querySelector('[aria-live]');
      const ariaLabel = ariaLiveEl?.getAttribute('aria-label') ?? '';
      expect(ariaLabel).toContain('25:00');
      expect(ariaLabel).toContain('作業中');
    });
  });

  describe('残り時間・フェーズラベルの表示（要件 1.1, 2.5）', () => {
    it('残り時間が MM:SS 形式で表示される', () => {
      const { getByText } = render(TimerDisplay, { props: defaultProps });

      expect(getByText('25:00')).toBeTruthy();
    });

    it('session フェーズでは "作業中" が表示される', () => {
      const { getByText } = render(TimerDisplay, { props: defaultProps });

      expect(getByText('作業中')).toBeTruthy();
    });

    it('shortBreak フェーズでは "短い休憩" と時間が表示される', () => {
      const { getByText } = render(TimerDisplay, {
        props: { phase: 'shortBreak' as Phase, secondsRemaining: 300, isRunning: false },
      });

      expect(getByText('短い休憩')).toBeTruthy();
      expect(getByText('05:00')).toBeTruthy();
    });

    it('longBreak フェーズでは "長い休憩" と時間が表示される', () => {
      const { getByText } = render(TimerDisplay, {
        props: { phase: 'longBreak' as Phase, secondsRemaining: 900, isRunning: false },
      });

      expect(getByText('長い休憩')).toBeTruthy();
      expect(getByText('15:00')).toBeTruthy();
    });
  });
});
