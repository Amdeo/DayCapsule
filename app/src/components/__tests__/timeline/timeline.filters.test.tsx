import { renderHook, act, waitFor } from '@testing-library/react-native';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { useTimelineFilters } from '../../timeline-v2/useTimelineFilters';

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

describe('useTimelineFilters', () => {
  it('shows branded feedback when clearing all filters fails to apply', async () => {
    const setSearchQuery = jest.fn();
    const setFilterType = jest.fn();
    const setFilterDateRange = jest.fn();
    const clearTags = jest.fn();
    const toggleTag = jest.fn();
    const applyFilters = jest.fn().mockRejectedValueOnce(new Error('filter query failed'));

    const { result } = renderHook(() =>
      useTimelineFilters({
        searchQuery: '旅行',
        filterType: 'photo',
        filterDateRange: 'week',
        selectedTags: ['旅行'],
        setSearchQuery,
        setFilterType,
        setFilterDateRange,
        toggleTag,
        clearTags,
        applyFilters,
      })
    );

    act(() => {
      result.current.clearAll();
    });

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith({
        title: '筛选失败',
        message: '筛选结果刷新失败，请稍后重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    });

    expect(setSearchQuery).toHaveBeenCalledWith('');
    expect(setFilterType).toHaveBeenCalledWith('all');
    expect(setFilterDateRange).toHaveBeenCalledWith('all');
    expect(clearTags).toHaveBeenCalledTimes(1);
  });
});
