/**
 * TimerControls.vue コンポーネントテスト
 *
 * - 全ボタンに aria-label が付与されていることを検証する（要件 8.2, 8.4）
 * - notifyPhaseEnd() で permission denied 時に Notification が呼ばれず
 *   AudioService のみ呼ばれることを検証する（要件 5.4）
 *
 * Requirements: 8.2, 8.4, 5.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/vue';
import TimerControls from '../../components/TimerControls.vue';
import { notifyPhaseEnd } from '../../services/NotificationService';

// AudioService をモック化して実際のビープ音が鳴らないようにする
vi.mock('../../services/AudioService', () => ({
  playPhaseEndSound: vi.fn(),
}));

import { playPhaseEndSound } from '../../services/AudioService';

// ---------------------------------------------------------------------------
// TimerControls.vue コンポーネントテスト
// ---------------------------------------------------------------------------

describe('TimerControls.vue', () => {
  describe('aria-label の付与（要件 8.2, 8.4）', () => {
    it('isRunning=false のとき、スタートボタンに aria-label="スタート" が付与されている', () => {
      const { getByRole } = render(TimerControls, {
        props: { isRunning: false },
      });

      const startBtn = getByRole('button', { name: 'スタート' });
      expect(startBtn).toBeTruthy();
      expect(startBtn.getAttribute('aria-label')).toBe('スタート');
    });

    it('isRunning=false のとき、リセットボタンに aria-label="リセット" が付与されている', () => {
      const { getByRole } = render(TimerControls, {
        props: { isRunning: false },
      });

      const resetBtn = getByRole('button', { name: 'リセット' });
      expect(resetBtn).toBeTruthy();
      expect(resetBtn.getAttribute('aria-label')).toBe('リセット');
    });

    it('isRunning=true のとき、一時停止ボタンに aria-label="一時停止" が付与されている', () => {
      const { getByRole } = render(TimerControls, {
        props: { isRunning: true },
      });

      const pauseBtn = getByRole('button', { name: '一時停止' });
      expect(pauseBtn).toBeTruthy();
      expect(pauseBtn.getAttribute('aria-label')).toBe('一時停止');
    });

    it('isRunning=true のとき、リセットボタンに aria-label="リセット" が付与されている', () => {
      const { getByRole } = render(TimerControls, {
        props: { isRunning: true },
      });

      const resetBtn = getByRole('button', { name: 'リセット' });
      expect(resetBtn).toBeTruthy();
      expect(resetBtn.getAttribute('aria-label')).toBe('リセット');
    });

    it('isRunning=false のとき、スタートボタンは type="button" を持つ', () => {
      const { getByRole } = render(TimerControls, {
        props: { isRunning: false },
      });

      const startBtn = getByRole('button', { name: 'スタート' });
      expect(startBtn.getAttribute('type')).toBe('button');
    });

    it('isRunning=true のとき、一時停止ボタンは type="button" を持つ', () => {
      const { getByRole } = render(TimerControls, {
        props: { isRunning: true },
      });

      const pauseBtn = getByRole('button', { name: '一時停止' });
      expect(pauseBtn.getAttribute('type')).toBe('button');
    });

    it('リセットボタンは常に type="button" を持つ', () => {
      const { getByRole } = render(TimerControls, {
        props: { isRunning: false },
      });

      const resetBtn = getByRole('button', { name: 'リセット' });
      expect(resetBtn.getAttribute('type')).toBe('button');
    });
  });
});

// ---------------------------------------------------------------------------
// notifyPhaseEnd — permission denied 時の動作テスト（要件 5.4）
// ---------------------------------------------------------------------------

describe('notifyPhaseEnd() — permission denied 時（要件 5.4）', () => {
  // Notification コンストラクタのモックを保持する
  let NotificationMock: ReturnType<typeof vi.fn>;
  let originalNotification: typeof Notification;

  beforeEach(() => {
    // Notification コンストラクタをモック化する
    NotificationMock = vi.fn();
    NotificationMock.permission = 'denied' as NotificationPermission;
    NotificationMock.requestPermission = vi.fn().mockResolvedValue('denied');

    originalNotification = global.Notification;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).Notification = NotificationMock;

    // playPhaseEndSound の呼び出し履歴をリセット
    vi.mocked(playPhaseEndSound).mockClear();
  });

  afterEach(() => {
    // グローバルの Notification を元に戻す
    global.Notification = originalNotification;
  });

  it('permission が denied のとき、playPhaseEndSound が呼ばれる（要件 5.4）', () => {
    notifyPhaseEnd('shortBreak');

    expect(playPhaseEndSound).toHaveBeenCalledOnce();
  });

  it('permission が denied のとき、new Notification() は呼ばれない（要件 5.4）', () => {
    notifyPhaseEnd('shortBreak');

    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it('permission が denied のとき、longBreak フェーズでも Notification は呼ばれない（要件 5.4）', () => {
    notifyPhaseEnd('longBreak');

    expect(playPhaseEndSound).toHaveBeenCalledOnce();
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it('permission が denied のとき、session フェーズでも Notification は呼ばれない（要件 5.4）', () => {
    notifyPhaseEnd('session');

    expect(playPhaseEndSound).toHaveBeenCalledOnce();
    expect(NotificationMock).not.toHaveBeenCalled();
  });
});
