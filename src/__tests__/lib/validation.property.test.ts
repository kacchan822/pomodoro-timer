// Feature: pomodoro-timer, Property 4: 設定バリデーションの境界整合性

import * as fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import { validateSettings } from '../../lib/validation';
import type { Settings } from '../../types';

// ---------------------------------------------------------------------------
// Property 4: 設定バリデーションの境界整合性
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.7
// ---------------------------------------------------------------------------

/** 合法な Settings を生成するアービトラリ */
const validSettingsArb = fc.record<Settings>({
  sessionMinutes: fc.integer({ min: 1, max: 60 }),
  shortBreakMinutes: fc.integer({ min: 1, max: 30 }),
  longBreakMinutes: fc.integer({ min: 1, max: 60 }),
  sessionsPerCycle: fc.integer({ min: 1, max: 8 }),
  notificationsEnabled: fc.boolean(),
});

describe('Property 4: validateSettings boundary consistency', () => {
  test('valid: true for all values within legal ranges', () => {
    fc.assert(
      fc.property(validSettingsArb, (settings) => {
        const result = validateSettings(settings);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  test('valid: false when sessionMinutes is out of range [1, 60]', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 0 }),          // < 1
          fc.integer({ min: 61 }),          // > 60
        ),
        validSettingsArb,
        (badValue, base) => {
          const settings: Settings = { ...base, sessionMinutes: badValue };
          const result = validateSettings(settings);
          expect(result.valid).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('valid: false when shortBreakMinutes is out of range [1, 30]', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.integer({ min: 31 }),
        ),
        validSettingsArb,
        (badValue, base) => {
          const settings: Settings = { ...base, shortBreakMinutes: badValue };
          const result = validateSettings(settings);
          expect(result.valid).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('valid: false when longBreakMinutes is out of range [1, 60]', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.integer({ min: 61 }),
        ),
        validSettingsArb,
        (badValue, base) => {
          const settings: Settings = { ...base, longBreakMinutes: badValue };
          const result = validateSettings(settings);
          expect(result.valid).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('valid: false when sessionsPerCycle is out of range [1, 8]', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.integer({ min: 9 }),
        ),
        validSettingsArb,
        (badValue, base) => {
          const settings: Settings = { ...base, sessionsPerCycle: badValue };
          const result = validateSettings(settings);
          expect(result.valid).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('valid: false when any field is a non-integer (float)', () => {
    fc.assert(
      fc.property(
        // Generate a float that is not an integer, in a plausible range.
        // fc.float requires 32-bit float boundaries (use Math.fround).
        fc.float({ min: Math.fround(1.1), max: Math.fround(59.9), noNaN: true, noDefaultInfinity: true }).filter(
          (v) => !Number.isInteger(v),
        ),
        validSettingsArb,
        (floatVal, base) => {
          const settings: Settings = { ...base, sessionMinutes: floatVal };
          const result = validateSettings(settings);
          expect(result.valid).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
