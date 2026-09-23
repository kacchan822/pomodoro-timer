/**
 * SettingsForm.vue コンポーネントテスト
 *
 * - 範囲外の値を入力したときにエラーメッセージが表示されることを検証する
 * - 範囲外の値を入力したときに保存ボタンが無効化されることを検証する
 *
 * Requirements: 3.7
 */

import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import SettingsForm from '../../components/SettingsForm.vue';
import { DEFAULT_SETTINGS } from '../../types';

describe('SettingsForm.vue（要件 3.7）', () => {
  const validProps = { currentSettings: { ...DEFAULT_SETTINGS } };

  describe('初期状態（合法な設定）', () => {
    it('エラーメッセージ（role="alert"）が表示されない', () => {
      const { queryAllByRole } = render(SettingsForm, { props: validProps });

      expect(queryAllByRole('alert')).toHaveLength(0);
    });

    it('保存ボタンが有効化されている', () => {
      const { getByRole } = render(SettingsForm, { props: validProps });

      const saveBtn = getByRole('button', { name: '設定を保存' });
      expect((saveBtn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('作業時間に範囲外の値を入力したとき', () => {
    it('エラーメッセージが表示され、保存ボタンが無効化される（上限超え: 61）', async () => {
      const { getByLabelText, getByRole, findByRole } = render(SettingsForm, {
        props: validProps,
      });

      const sessionInput = getByLabelText('作業時間（分）');
      await fireEvent.update(sessionInput, '61');

      // エラーメッセージが表示される
      const alert = await findByRole('alert');
      expect(alert.textContent).toContain('作業時間は 1〜60 分の範囲で入力してください。');

      // 保存ボタンが無効化される
      const saveBtn = getByRole('button', { name: '設定を保存' });
      expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it('エラーメッセージが表示され、保存ボタンが無効化される（下限未満: 0）', async () => {
      const { getByLabelText, getByRole, findByRole } = render(SettingsForm, {
        props: validProps,
      });

      const sessionInput = getByLabelText('作業時間（分）');
      await fireEvent.update(sessionInput, '0');

      const alert = await findByRole('alert');
      expect(alert.textContent).toContain('作業時間は 1〜60 分の範囲で入力してください。');

      const saveBtn = getByRole('button', { name: '設定を保存' });
      expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('短い休憩に範囲外の値を入力したとき', () => {
    it('エラーメッセージが表示され、保存ボタンが無効化される（上限超え: 31）', async () => {
      const { getByLabelText, getByRole, findByRole } = render(SettingsForm, {
        props: validProps,
      });

      const shortBreakInput = getByLabelText('短い休憩（分）');
      await fireEvent.update(shortBreakInput, '31');

      const alert = await findByRole('alert');
      expect(alert.textContent).toContain('短い休憩は 1〜30 分の範囲で入力してください。');

      const saveBtn = getByRole('button', { name: '設定を保存' });
      expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('長い休憩に範囲外の値を入力したとき', () => {
    it('エラーメッセージが表示され、保存ボタンが無効化される（上限超え: 61）', async () => {
      const { getByLabelText, getByRole, findByRole } = render(SettingsForm, {
        props: validProps,
      });

      const longBreakInput = getByLabelText('長い休憩（分）');
      await fireEvent.update(longBreakInput, '61');

      const alert = await findByRole('alert');
      expect(alert.textContent).toContain('長い休憩は 1〜60 分の範囲で入力してください。');

      const saveBtn = getByRole('button', { name: '設定を保存' });
      expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('サイクルあたりのセッション数に範囲外の値を入力したとき', () => {
    it('エラーメッセージが表示され、保存ボタンが無効化される（上限超え: 9）', async () => {
      const { getByLabelText, getByRole, findByRole } = render(SettingsForm, {
        props: validProps,
      });

      const cycleInput = getByLabelText('サイクルあたりのセッション数');
      await fireEvent.update(cycleInput, '9');

      const alert = await findByRole('alert');
      expect(alert.textContent).toContain(
        'サイクルあたりのセッション数は 1〜8 の範囲で入力してください。',
      );

      const saveBtn = getByRole('button', { name: '設定を保存' });
      expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('範囲外の値を合法な値に修正したとき', () => {
    it('エラーメッセージが消え、保存ボタンが再び有効化される', async () => {
      const { getByLabelText, getByRole, queryAllByRole } = render(SettingsForm, {
        props: validProps,
      });

      const sessionInput = getByLabelText('作業時間（分）');
      const saveBtn = getByRole('button', { name: '設定を保存' });

      // まず範囲外にする
      await fireEvent.update(sessionInput, '61');
      expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
      expect(queryAllByRole('alert').length).toBeGreaterThan(0);

      // 合法な値に修正する
      await fireEvent.update(sessionInput, '30');
      expect((saveBtn as HTMLButtonElement).disabled).toBe(false);
      expect(queryAllByRole('alert')).toHaveLength(0);
    });
  });
});
