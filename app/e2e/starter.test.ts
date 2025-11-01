import {device, expect, element, by} from 'detox';

describe('MemoryCapsule App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show welcome screen', async () => {
    await expect(element(by.text('Welcome to MemoryCapsule'))).toBeVisible();
  });
});
