/**
 * 2 つの YYYY-MM-DD 形式の日付文字列が同じ日かを判定する
 *
 * 単純な文字列等価比較を行う。
 * 対称律: isSameDay(a, b) === isSameDay(b, a)
 * 反射律: isSameDay(a, a) === true
 *
 * @param a YYYY-MM-DD 形式の日付文字列
 * @param b YYYY-MM-DD 形式の日付文字列
 * @returns 同じ日付の場合 true、それ以外 false
 */
export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

/**
 * ローカルタイムゾーンで今日の日付を YYYY-MM-DD 形式で返す
 *
 * @returns 今日の日付文字列（例: "2024-01-15"）
 */
export function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
