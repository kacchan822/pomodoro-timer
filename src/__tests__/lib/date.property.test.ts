// Feature: pomodoro-timer, Property 7: `isSameDay` の対称性

import * as fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import { isSameDay } from '../../lib/date';

// ---------------------------------------------------------------------------
// Property 7: `isSameDay` の対称性
// Validates: Requirements 6.1, 6.5
// ---------------------------------------------------------------------------

/** YYYY-MM-DD 形式の日付文字列を生成するアービトラリ */
const dateStringArb = fc
  .tuple(
    fc.integer({ min: 2000, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }), // max 28 to avoid month-length edge cases
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

describe('Property 7: isSameDay symmetry and reflexivity', () => {
  test('symmetry: isSameDay(a, b) === isSameDay(b, a)', () => {
    fc.assert(
      fc.property(dateStringArb, dateStringArb, (a, b) => {
        expect(isSameDay(a, b)).toBe(isSameDay(b, a));
      }),
      { numRuns: 100 },
    );
  });

  test('reflexivity: isSameDay(a, a) === true', () => {
    fc.assert(
      fc.property(dateStringArb, (a) => {
        expect(isSameDay(a, a)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
