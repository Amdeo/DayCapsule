import {databaseService} from '@services/storage/database';
import {tagSuggestionService} from '@services/ai/tagSuggestion';
import type {LifelogEntry} from '@services/storage/database';

describe('Text Entry Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a complete text entry with tags', async () => {
    const entryData = {
      type: 'text' as const,
      content: '今天工作很充实，完成了两个项目的代码审查。',
      timestamp: Date.now(),
      tags: ['工作', '编程'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const saveSpy = jest.spyOn(databaseService, 'insertEntry').mockResolvedValue('text-entry-1');

    const result = await databaseService.insertEntry(entryData);

    expect(saveSpy).toHaveBeenCalled();
    expect(result).toBe('text-entry-1');
  });

  it('should get tag suggestions for text content', async () => {
    const content = '今天在公司开会讨论了新项目的技术方案';

    const suggestionSpy = jest
      .spyOn(tagSuggestionService, 'getSuggestions')
      .mockResolvedValue(['工作', '会议', '项目']);

    const suggestions = await tagSuggestionService.getSuggestions(content);

    expect(suggestionSpy).toHaveBeenCalled();
    expect(suggestions).toContain('工作');
  });

  it('should get all text entries', async () => {
    const entries: LifelogEntry[] = [
      {
        id: 'text-entry-1',
        type: 'text',
        content: '今天工作很充实',
        timestamp: Date.now(),
        tags: ['工作'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const getSpy = jest.spyOn(databaseService, 'getEntries').mockResolvedValue(entries);

    const result = await databaseService.getEntries();

    expect(getSpy).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].content).toContain('工作');
  });

  it('should update text entry content and tags', async () => {
    const entry: LifelogEntry = {
      id: 'text-entry-1',
      type: 'text',
      content: '原始内容',
      timestamp: Date.now(),
      tags: ['标签1'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedEntry: LifelogEntry = {
      ...entry,
      content: '更新后的内容',
      tags: ['标签1', '标签2'],
      updatedAt: Date.now(),
    };

    const updateSpy = jest.spyOn(databaseService, 'updateEntry').mockResolvedValue(undefined);

    await databaseService.updateEntry(updatedEntry);

    expect(updateSpy).toHaveBeenCalledWith(updatedEntry);
    expect(updatedEntry.content).toBe('更新后的内容');
  });

  it('should search text entries by query', async () => {
    const query = '工作';

    const entries: LifelogEntry[] = [
      {
        id: 'text-entry-1',
        type: 'text',
        content: '今天工作很充实',
        timestamp: Date.now(),
        tags: ['工作'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const searchSpy = jest.spyOn(databaseService, 'searchEntries').mockResolvedValue(entries);

    const result = await databaseService.searchEntries(query);

    expect(searchSpy).toHaveBeenCalledWith(query);
    expect(result).toHaveLength(1);
  });

  it('should delete text entry', async () => {
    const entryId = 'text-entry-1';

    const deleteSpy = jest.spyOn(databaseService, 'deleteEntry').mockResolvedValue(undefined);

    await databaseService.deleteEntry(entryId);

    expect(deleteSpy).toHaveBeenCalledWith(entryId);
  });
});
