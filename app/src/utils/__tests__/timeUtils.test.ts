import {
  formatDetailedTime,
  formatHHMM,
  formatMMSS,
} from '../timeUtils';

describe('timeUtils formatting helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-18T12:00:00+08:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('formats seconds as MM:SS', () => {
    expect(formatMMSS(222)).toBe('03:42');
    expect(formatMMSS(5)).toBe('00:05');
  });

  it('formats timestamps as HH:mm', () => {
    expect(formatHHMM(new Date(2026, 2, 18, 9, 5, 0).getTime())).toBe('09:05');
  });

  it('formats detailed timestamps as YYYY-MM-DD HH:mm:ss', () => {
    expect(formatDetailedTime(new Date(2026, 2, 18, 9, 5, 7).getTime())).toBe(
      '2026-03-18 09:05:07'
    );
  });
});
