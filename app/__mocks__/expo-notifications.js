const addNotificationResponseReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));

module.exports = {
  addNotificationResponseReceivedListener,
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
  },
};
