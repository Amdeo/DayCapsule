import { Storage, withScope } from '../storage';

describe('Storage error paths (mmkv throws)', () => {
  let errorStorage: typeof Storage;

  beforeAll(() => {
    jest.doMock('react-native-mmkv', () => ({
      createMMKV: () => ({
        set: () => { throw new Error('write error'); },
        getString: () => { throw new Error('read error'); },
        remove: () => { throw new Error('delete error'); },
        clearAll: () => { throw new Error('clear error'); },
        getAllKeys: () => { throw new Error('keys error'); },
      }),
    }));
    jest.resetModules();
    errorStorage = require('../storage').Storage;
  });

  afterAll(() => {
    jest.dontMock('react-native-mmkv');
    jest.resetModules();
  });

  it('setString catches and logs error', async () => {
    await expect(errorStorage.setString('key', 'value')).resolves.not.toThrow();
  });

  it('getString returns null on error', async () => {
    await expect(errorStorage.getString('key')).resolves.toBeNull();
  });

  it('getStringSync returns null on error', () => {
    expect(errorStorage.getStringSync('key')).toBeNull();
  });

  it('setObject catches and logs error', async () => {
    await expect(errorStorage.setObject('key', { a: 1 })).resolves.not.toThrow();
  });

  it('getObject returns null on error', async () => {
    await expect(errorStorage.getObject('key')).resolves.toBeNull();
  });

  it('getObjectSync returns null on error', () => {
    expect(errorStorage.getObjectSync('key')).toBeNull();
  });

  it('delete catches and logs error', async () => {
    await expect(errorStorage.delete('key')).resolves.not.toThrow();
  });

  it('clearAll catches and logs error', async () => {
    await expect(errorStorage.clearAll()).resolves.not.toThrow();
  });

  it('getAllKeys returns empty array on error', async () => {
    await expect(errorStorage.getAllKeys()).resolves.toEqual([]);
  });
});

describe('withScope', () => {
  it('joins scope and key with colon', () => {
    expect(withScope('env_foo', 'myKey')).toBe('env_foo:myKey');
  });

  it('handles empty scope', () => {
    expect(withScope('', 'key')).toBe(':key');
  });
});

describe('Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('string operations', () => {
    it('sets and gets a string', async () => {
      await Storage.setString('testKey', 'hello');
      const value = await Storage.getString('testKey');
      expect(value).toBe('hello');
    });

    it('returns null for missing string key', async () => {
      const value = await Storage.getString('nonexistent');
      expect(value).toBeNull();
    });

    it('gets string synchronously', async () => {
      await Storage.setString('syncKey', 'syncValue');
      const value = Storage.getStringSync('syncKey');
      expect(value).toBe('syncValue');
    });

    it('returns null for missing sync key', () => {
      const value = Storage.getStringSync('missing');
      expect(value).toBeNull();
    });
  });

  describe('object operations', () => {
    it('sets and gets an object', async () => {
      const obj = { name: 'test', count: 42 };
      await Storage.setObject('objKey', obj);
      const result = await Storage.getObject<typeof obj>('objKey');
      expect(result).toEqual(obj);
    });

    it('returns null for missing object key', async () => {
      const result = await Storage.getObject('missing');
      expect(result).toBeNull();
    });

    it('gets object synchronously', async () => {
      const obj = { a: 1, b: 2 };
      await Storage.setObject('syncObjKey', obj);
      const result = Storage.getObjectSync<typeof obj>('syncObjKey');
      expect(result).toEqual(obj);
    });

    it('returns null for missing sync object', () => {
      const result = Storage.getObjectSync('missing');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes a key', async () => {
      await Storage.setString('toDelete', 'value');
      await Storage.delete('toDelete');
      const result = await Storage.getString('toDelete');
      expect(result).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('removes all keys', async () => {
      await Storage.setString('key1', 'a');
      await Storage.setString('key2', 'b');
      await Storage.clearAll();
      expect(await Storage.getString('key1')).toBeNull();
      expect(await Storage.getString('key2')).toBeNull();
    });
  });

  describe('getAllKeys', () => {
    it('returns all stored keys', async () => {
      await Storage.clearAll();
      await Storage.setString('alpha', '1');
      await Storage.setString('beta', '2');
      const keys = await Storage.getAllKeys();
      expect(keys).toEqual(expect.arrayContaining(['alpha', 'beta']));
    });

    it('returns empty array when no keys stored', async () => {
      await Storage.clearAll();
      const keys = await Storage.getAllKeys();
      expect(keys).toEqual([]);
    });
  });
});
