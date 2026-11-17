import { describe, expect, it } from 'vitest';
import { relativeTime } from './time';

const now = new Date('2026-11-17T12:00:00Z').getTime();
const ago = (ms: number) => new Date(now - ms).toISOString();

describe('relativeTime', () => {
  it('formats recent times', () => {
    expect(relativeTime(ago(10_000), now)).toBe('just now');
    expect(relativeTime(ago(2 * 60_000), now)).toBe('2 min ago');
    expect(relativeTime(ago(3 * 3_600_000), now)).toBe('3 h ago');
    expect(relativeTime(ago(5 * 86_400_000), now)).toBe('5 d ago');
  });
  it('never goes negative for clock skew', () => {
    expect(relativeTime(new Date(now + 60_000).toISOString(), now)).toBe('just now');
  });
  it('returns empty for garbage', () => {
    expect(relativeTime('nope', now)).toBe('');
  });
});
