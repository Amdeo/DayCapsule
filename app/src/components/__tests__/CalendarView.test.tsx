// app/src/components/__tests__/CalendarView.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CalendarView } from '../CalendarView';
import { Entry } from '@/src/types/entry';

// 固定"今天"为 2026-03-19，避免测试受真实日期影响
const FIXED_NOW = new Date('2026-03-19T12:00:00+08:00');
const OriginalDate = Date;

beforeAll(() => {
  const dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
    if (args.length === 0) return new OriginalDate(FIXED_NOW);
    return new OriginalDate(...args as [any]);
  });
  // 把静态方法挂回 mock，确保 Date.now() 可用
  (dateSpy as any).now = () => FIXED_NOW.getTime();
});

afterAll(() => {
  jest.restoreAllMocks();
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text> };
});

const makeEntry = (id: string, isoDate: string, type: Entry['type'] = 'text'): Entry => ({
  id,
  type,
  content: `内容 ${id}`,
  tags: [],
  timestamp: new OriginalDate(isoDate).getTime(),
  syncStatus: 'synced',
});

// 当月（3月）有记录的几天
const march17 = makeEntry('e1', '2026-03-17T09:00:00+08:00', 'text');
const march18a = makeEntry('e2', '2026-03-18T10:00:00+08:00', 'photo');
const march18b = makeEntry('e3', '2026-03-18T14:00:00+08:00', 'text');
// 其他月份的记录（不应显示）
const feb10 = makeEntry('e4', '2026-02-10T08:00:00+08:00', 'text');

const marchEntries = [march17, march18a, march18b];
const allEntries = [...marchEntries, feb10];

describe('CalendarView', () => {
  it('默认状态下显示当月所有记录', () => {
    const { getByText, queryByText } = render(
      <CalendarView entries={allEntries} />
    );
    // 当月记录内容可见
    expect(getByText('内容 e1')).toBeTruthy();
    expect(getByText('内容 e2')).toBeTruthy();
    expect(getByText('内容 e3')).toBeTruthy();
    // 其他月份记录不显示
    expect(queryByText('内容 e4')).toBeNull();
  });

  it('默认状态下不显示"取消"按钮', () => {
    const { queryByTestId } = render(<CalendarView entries={marchEntries} />);
    expect(queryByTestId('calendar-deselect-btn')).toBeNull();
  });

  it('点击有记录的日期后只显示当天记录', () => {
    const { getByText, queryByText } = render(
      <CalendarView entries={marchEntries} />
    );
    // 点击 18 号
    fireEvent.press(getByText('18'));

    expect(getByText('内容 e2')).toBeTruthy();
    expect(getByText('内容 e3')).toBeTruthy();
    // 17 号记录消失
    expect(queryByText('内容 e1')).toBeNull();
  });

  it('选中日期后显示"取消"按钮', () => {
    const { getByText, getByTestId } = render(
      <CalendarView entries={marchEntries} />
    );
    fireEvent.press(getByText('18'));
    expect(getByTestId('calendar-deselect-btn')).toBeTruthy();
  });

  it('再次点击同一天恢复显示全月', () => {
    const { getByText, queryByText } = render(
      <CalendarView entries={marchEntries} />
    );
    fireEvent.press(getByText('18'));
    fireEvent.press(getByText('18')); // 再次点击取消

    expect(getByText('内容 e1')).toBeTruthy();
    expect(queryByText('内容 e4')).toBeNull();
  });

  it('点击取消按钮恢复显示全月', () => {
    const { getByText, getByTestId, queryByText } = render(
      <CalendarView entries={marchEntries} />
    );
    fireEvent.press(getByText('18'));
    fireEvent.press(getByTestId('calendar-deselect-btn'));

    expect(getByText('内容 e1')).toBeTruthy();
  });

  it('切换月份后清空日期选中并显示新月数据', () => {
    const feb5 = makeEntry('e5', '2026-02-05T10:00:00+08:00', 'text');
    const { getByText, queryByText, queryByTestId } = render(
      <CalendarView entries={[...marchEntries, feb5]} />
    );
    // 先选中 18 号，确认取消按钮出现
    fireEvent.press(getByText('18'));
    expect(queryByTestId('calendar-deselect-btn')).toBeTruthy();

    // 切换到上月（2月），icon name 是 'chevron-back'
    fireEvent.press(getByText('chevron-back'));

    // 取消按钮消失（同一组件实例，selectedKey 已清空）
    expect(queryByTestId('calendar-deselect-btn')).toBeNull();
    // 应显示 2 月记录
    expect(getByText('内容 e5')).toBeTruthy();
    // 3 月记录不显示
    expect(queryByText('内容 e1')).toBeNull();
  });
});
