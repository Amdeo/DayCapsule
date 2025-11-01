export const fetch = jest.fn().mockResolvedValue({
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
  details: {
    isConnectionExpensive: false,
    cellularGeneration: null,
  },
});

export const addEventListener = jest.fn(() => jest.fn());

export default {
  fetch,
  addEventListener,
};
