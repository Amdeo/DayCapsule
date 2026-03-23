import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CalendarView } from '../CalendarView';
import { Entry } from '@/src/types/entry';

const FIXED_NOW = new Date('2026-03-19T12:00:00+08:00');
const OriginalDate = Date;

beforeAll(() => {
  const dateSpy = jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
    if (args.length === 0) return new OriginalDate(FIXED_NOW);
    return new OriginalDate(...(args as [any]));
  });
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

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: (selector: (state: { calendarDensity: 'default' }) => unknown) =>
    selector({ calendarDensity: 'default' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

let latestCalendarTimelineItemProps: Record<string, unknown> | undefined;

jest.mock('../CalendarTimelineItem', () => ({
  CalendarTimelineItem: ({ entry, ...rest }: { entry: Entry } & Record<string, unknown>) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    latestCalendarTimelineItemProps = rest;

    return (
      <View>
        {entry.type === 'photo' ? (
          <View testID={`calendar-photo-card-layout-${(entry.media?.length ?? 0) > 1 ? 'multi' : 'single'}-${entry.id}`} />
        ) : null}
        {entry.type === 'voice' ? (
          <>
            <View testID={`calendar-voice-play-button-${entry.id}`} />
            {entry.recordingStatus === 'recording' ? (
              <View testID={`calendar-recording-status-${entry.id}`} />
            ) : null}
          </>
        ) : null}
        <Text>{entry.content}</Text>
        {entry.tags?.map((tag) => (
          <Text key={tag}>#{tag}</Text>
        ))}
        {entry.transcription?.text ? <Text>{entry.transcription.text}</Text> : null}
      </View>
    );
  },
}));

const noop = jest.fn();

const makeTextEntry = (id: string, isoDate: string, overrides: Partial<Entry> = {}): Entry => ({
  id,
  type: 'text',
  content: `文字内容 ${id}`,
  tags: ['产品', '交互'],
  timestamp: new OriginalDate(isoDate).getTime(),
  syncStatus: 'synced',
  ...overrides,
});

const makePhotoEntry = (
  id: string,
  isoDate: string,
  mediaCount: number,
  overrides: Partial<Entry> = {}
): Entry => ({
  id,
  type: 'photo',
  content: '',
  tags: ['照片', '夜景'],
  timestamp: new OriginalDate(isoDate).getTime(),
  syncStatus: 'synced',
  media: Array.from({ length: mediaCount }, (_, index) => ({
    uri: `file:///photo-${id}-${index + 1}.jpg`,
    mimeType: 'image/jpeg',
    size: 1024,
    metadata: {
      width: 900,
      height: 1200,
      aspectRatio: 0.75,
      createdAt: FIXED_NOW.getTime(),
      modifiedAt: FIXED_NOW.getTime(),
    },
  })),
  ...overrides,
});

const makeVoiceEntry = (id: string, isoDate: string, overrides: Partial<Entry> = {}): Entry => ({
  id,
  type: 'voice',
  content: '',
  tags: ['灵感'],
  timestamp: new OriginalDate(isoDate).getTime(),
  syncStatus: 'synced',
  media: [
    {
      uri: `file:///voice-${id}.m4a`,
      mimeType: 'audio/m4a',
      size: 2048,
      duration: 108000,
      metadata: {
        createdAt: FIXED_NOW.getTime(),
        modifiedAt: FIXED_NOW.getTime(),
      },
    },
  ],
  transcription: {
    text: `转录 ${id}`,
    language: 'zh-CN',
    confidence: 0.93,
    model: 'local',
    duration: 180,
  },
  ...overrides,
});

const marchText = makeTextEntry('t1', '2026-03-17T09:00:00+08:00');
const marchPhotoMulti = makePhotoEntry('p1', '2026-03-18T10:00:00+08:00', 3);
const marchPhotoSingle = makePhotoEntry('p2', '2026-03-18T11:30:00+08:00', 1);
const marchVoice = makeVoiceEntry('v1', '2026-03-18T14:00:00+08:00');
const marchRecording = makeVoiceEntry('v2', '2026-03-18T15:00:00+08:00', {
  recordingStatus: 'recording',
  recordingDuration: 12,
  transcription: undefined,
});
const febText = makeTextEntry('t2', '2026-02-10T08:00:00+08:00');

const calendarProps = {
  entries: [marchText, marchPhotoMulti, marchPhotoSingle, marchVoice, marchRecording, febText],
  onDeleteEntry: noop,
  onEditEntry: noop,
  onStopRecording: noop,
  activeActionSheetId: null,
  onActionSheetOpen: noop,
};

describe('CalendarView full-card behavior', () => {
  beforeEach(() => {
    latestCalendarTimelineItemProps = undefined;
  });

  it('renders calendar view shell and content header', () => {
    const screen = render(<CalendarView {...calendarProps} />);

    expect(screen.getByTestId('calendar-view-root')).toBeTruthy();
    expect(screen.getByTestId('calendar-grid')).toBeTruthy();
    expect(screen.getByTestId('calendar-content-header')).toBeTruthy();
  });

  it('默认状态下显示当月记录且保留媒体卡片信息', () => {
    const { getByText, queryByText, getByTestId } = render(
      <CalendarView {...calendarProps} />
    );

    expect(getByText('文字内容 t1')).toBeTruthy();
    expect(getByText('#产品')).toBeTruthy();
    expect(getByTestId('calendar-photo-card-layout-multi-p1')).toBeTruthy();
    expect(getByTestId('calendar-photo-card-layout-single-p2')).toBeTruthy();
    expect(getByTestId('calendar-voice-play-button-v1')).toBeTruthy();
    expect(getByText('转录 v1')).toBeTruthy();
    expect(getByTestId('calendar-recording-status-v2')).toBeTruthy();
    expect(queryByText('文字内容 t2')).toBeNull();
    expect(latestCalendarTimelineItemProps?.onPauseRecording).toBeUndefined();
    expect(latestCalendarTimelineItemProps?.onResumeRecording).toBeUndefined();
    expect(latestCalendarTimelineItemProps?.onStopRecording).toBe(noop);
  });

  it('默认状态下不显示取消按钮', () => {
    const { queryByTestId } = render(<CalendarView {...calendarProps} />);
    expect(queryByTestId('calendar-deselect-btn')).toBeNull();
  });

  it('点击某天后仅显示当天记录并保留完整能力', () => {
    const { getByText, queryByText, getByTestId } = render(
      <CalendarView {...calendarProps} />
    );

    fireEvent.press(getByText('18'));

    expect(queryByText('文字内容 t1')).toBeNull();
    expect(getByTestId('calendar-photo-card-layout-multi-p1')).toBeTruthy();
    expect(getByTestId('calendar-voice-play-button-v1')).toBeTruthy();
    expect(getByTestId('calendar-recording-status-v2')).toBeTruthy();
  });

  it('选中日期后显示取消按钮', () => {
    const { getByText, getByTestId } = render(<CalendarView {...calendarProps} />);

    fireEvent.press(getByText('18'));

    expect(getByTestId('calendar-deselect-btn')).toBeTruthy();
  });

  it('再次点击同一天恢复全月显示', () => {
    const { getByText, queryByText } = render(<CalendarView {...calendarProps} />);

    fireEvent.press(getByText('18'));
    fireEvent.press(getByText('18'));

    expect(getByText('文字内容 t1')).toBeTruthy();
    expect(queryByText('文字内容 t2')).toBeNull();
  });

  it('切换月份后清空日期选中并显示新月数据', () => {
    const { getByText, queryByText, queryByTestId } = render(<CalendarView {...calendarProps} />);

    fireEvent.press(getByText('18'));
    expect(queryByTestId('calendar-deselect-btn')).toBeTruthy();

    fireEvent.press(getByText('chevron-back'));

    expect(queryByTestId('calendar-deselect-btn')).toBeNull();
    expect(getByText('文字内容 t2')).toBeTruthy();
    expect(queryByText('文字内容 t1')).toBeNull();
  });
});
