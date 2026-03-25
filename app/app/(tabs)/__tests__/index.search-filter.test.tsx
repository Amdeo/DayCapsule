import { fireEvent, waitFor } from '@testing-library/react-native';
import type { Entry } from '@/src/types/entry';
import { renderHomeScreen } from '@/src/components/__tests__/helpers/renderHomeScreen';

const homeEntries = [
  {
    id: 'entry-text-1',
    type: 'text',
    content: '整理旅行照片',
    tags: ['旅行'],
    timestamp: new Date('2026-03-20T09:00:00+08:00').getTime(),
    syncStatus: 'synced',
  },
  {
    id: 'entry-photo-1',
    type: 'photo',
    content: '旅行海边照片',
    tags: ['旅行', '海边'],
    timestamp: new Date('2026-03-21T09:00:00+08:00').getTime(),
    syncStatus: 'synced',
    media: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg', size: 123 }],
  },
] as Entry[];

describe('HomeScreen search filters', () => {
  it('opens search from the home search box and dismisses it from the cancel button', async () => {
    const { screen, spies } = renderHomeScreen({
      entries: homeEntries,
      allTags: ['旅行', '海边'],
    });

    fireEvent.press(screen.getByTestId('searchbar-search-box'));
    expect(screen.getByTestId('search-overlay-root')).toBeTruthy();

    await waitFor(() => {
      expect(spies.getAllTags).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByTestId('search-overlay-cancel-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('search-overlay-root')).toBeNull();
    });
  });

  it('applies keyword, type and tag filters from the real home screen search flow', async () => {
    const { screen, spies } = renderHomeScreen({
      entries: homeEntries,
      allTags: ['旅行', '海边'],
    });

    fireEvent.press(screen.getByTestId('searchbar-search-box'));

    await waitFor(() => {
      expect(spies.getAllTags).toHaveBeenCalledTimes(1);
    });

    fireEvent.changeText(screen.getByPlaceholderText('搜索记忆...'), '旅行');
    fireEvent.press(screen.getByText('照片'));
    fireEvent.press(screen.getByText('#旅行'));
    fireEvent.press(screen.getByTestId('search-overlay-submit-button'));

    await waitFor(() => {
      expect(spies.applySearchFilters).toHaveBeenCalledWith({
        query: '旅行',
        type: 'photo',
        dateRange: 'all',
        tags: ['旅行'],
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('search-overlay-root')).toBeNull();
    });

    expect(screen.getByText('1 条')).toBeTruthy();
    expect(screen.getByText('"旅行"')).toBeTruthy();
    expect(screen.getByText('照片')).toBeTruthy();
    expect(screen.getByText('#旅行')).toBeTruthy();
    expect(screen.getByTestId('timeline-entry-entry-photo-1')).toBeTruthy();
  });
});
