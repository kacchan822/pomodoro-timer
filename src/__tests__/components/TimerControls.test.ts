/**
 * TimerControls.vue コンポーネントテスト
 *
 * - 全ボタンに aria-label / type="button" が付与されていることを検証する（要件 8.2, 8.4）
 * - notifyPhaseEnd() の通知許可状態に応じた動作を検証する（要件 5.2, 5.4）
 * （旧 TimerControls.component.test.ts を統合済み）
 *
 * Requirements: 8.2, 8.4, 5.2, 5.4
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
// aria-label / type="button" の付与（要件 8.2, 8.4）
// ---------------------------------------------------------------------------

describe('TimerControls.vue — ボタン属性（要件 8.2, 8.4）', () => {
  it('isRunning=false のとき、全ボタンに空でない aria-label が付与されている', () => {
    const { container } = render(TimerControls, { props: { isRunning: false } });

    const buttons = container.querySelectorAll('button');
    // 停止中はスタート + リセットの 2 ボタン
    expect(buttons.length).toBe(2);
    buttons.forEach((btn) => {
      const label = btn.getAttribute('aria-label');
      expect(label).not.toBeNull();
      expect(label?.trim().length ?? 0).toBeGreaterThan(0);
    });
  });

  it('isRunning=true のとき、全ボタンに空でない aria-label が付与されている', () => {
    const { container } = render(TimerControls, { props: { isRunning: true } });

    const buttons = container.querySelectorAll('button');
    // 実行中は一時停止 + リセットの 2 ボタン
    expect(buttons.length).toBe(2);
    buttons.forEach((btn) => {
      const label = btn.getAttribute('aria-label');
      expect(label).not.toBeNull();
      expect(label?.trim().length ?? 0).toBeGreaterThan(0);
    });
  });

  it('isRunning=false のとき、スタートボタンに aria-label="スタート" が付与されている', () => {
    const { getByRole } = render(TimerControls, { props: { isRunning: false } });

    const startBtn = getByRole('button', { name: 'スタート' });
    expect(startBtn.getAttribute('aria-label')).toBe('スタート');
  });

  it('isRunning=true のとき、一時停止ボタンに aria-label="一時停止" が付与されている', () => {
    const { getByRole } = render(TimerControls, { props: { isRunning: true } });

    const pauseBtn = getByRole('button', { name: '一時停止' });
    expect(pauseBtn.getAttribute('aria-label')).toBe('一時停止');
  });

  it('リセットボタンには常に aria-label="リセット" が付与されている', () => {
    for (const isRunning of [false, true]) {
      const { getByRole, unmount } = render(TimerControls, { props: { isRunning } });
      const resetBtn = getByRole('button', { name: 'リセット' });
      expect(resetBtn.getAttribute('aria-label')).toBe('リセット');
      unmount();
    }
  });

  it('全ボタンに type="button" が指定されている', () => {
    for (const isRunning of [false, true]) {
      const { container, unmount } = render(TimerControls, { props: { isRunning } });
      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        expect(btn.getAttribute('type')).toBe('button');
      });
      unmount();
    }
  });
});

// ---------------------------------------------------------------------------
// notifyPhaseEnd — 通知許可の状態に応じた動作（要件 5.2, 5.4）
// ---------------------------------------------------------------------------

describe('notifyPhaseEnd() — 通知許可の状態に応じた動作（要件 5.2, 5.4）', () => {
  let NotificationMock: ReturnType<typeof vi.fn> & {
    permission: NotificationPermission;
    requestPermission: ReturnType<typeof vi.fn>;
  };
  let originalNotification: typeof Notification | undefined;

  beforeEach(() => {
    NotificationMock = vi.fn() as unknown as typeof NotificationMock;
    NotificationMock.requestPermission = vi.fn().mockResolvedValue('denied');

    originalNotification = (global as { Notification?: typeof Notification }).Notification;
    (global as unknown as { Notification: unknown }).Notification = NotificationMock;

    vi.mocked(playPhaseEndSound).mockClear();
  });

  afterEach(() => {
    (global as unknown as { Notification: unknown }).Notification = originalNotification;
  });

  it('permission=denied のとき、playPhaseEndSound が 1 回呼ばれる（要件 5.4）', () => {
    NotificationMock.permission = 'denied';

    notifyPhaseEnd('shortBreak');

    expect(playPhaseEndSound).toHaveBeenCalledOnce();
  });

  it('permission=denied のとき、new Notification() は呼ばれない（要件 5.4）', () => {
    NotificationMock.permission = 'denied';

    notifyPhaseEnd('shortBreak');

    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it('permission=denied のとき、どのフェーズでも Notification は呼ばれずサウンドのみ再生される（要件 5.4）', () => {
    NotificationMock.permission = 'denied';

    for (const phase of ['session', 'shortBreak', 'longBreak'] as const) {
      vi.mocked(playPhaseEndSound).mockClear();
      NotificationMock.mockClear();

      notifyPhaseEnd(phase);

      expect(playPhaseEndSound).toHaveBeenCalledOnce();
      expect(NotificationMock).not.toHaveBeenCalled();
    }
  });

  it('permission=default（未応答）のときも Notification は呼ばれずサウンドのみ再生される（要件 5.4）', () => {
    NotificationMock.permission = 'default';

    notifyPhaseEnd('shortBreak');

    expect(playPhaseEndSound).toHaveBeenCalledOnce();
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it('permission=granted のとき、サウンド再生に加えて Notification が表示される（要件 5.2）', () => {
    NotificationMock.permission = 'granted';

    notifyPhaseEnd('shortBreak');

    expect(playPhaseEndSound).toHaveBeenCalledOnce();
    expect(NotificationMock).toHaveBeenCalledOnce();
  });
});
