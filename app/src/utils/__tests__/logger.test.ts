describe('logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('in development (__DEV__ = true)', () => {
    let loggerDev: typeof import('../logger').logger;
    let SentryDev: typeof import('@sentry/react-native');

    beforeAll(() => {
      jest.isolateModules(() => {
        (globalThis as Record<string, unknown>).__DEV__ = true;
        loggerDev = require('../logger').logger;
        SentryDev = require('@sentry/react-native');
      });
    });

    it('calls console.log for log level', () => {
      loggerDev.log('test log', 123);
      expect(console.log).toHaveBeenCalledWith('test log', 123);
    });

    it('calls console.warn for warn level', () => {
      loggerDev.warn('test warn');
      expect(console.warn).toHaveBeenCalledWith('test warn');
    });

    it('calls console.error but not Sentry in dev', () => {
      loggerDev.error('test error');
      expect(console.error).toHaveBeenCalledWith('test error');
      expect(SentryDev.captureException).not.toHaveBeenCalled();
      expect(SentryDev.captureMessage).not.toHaveBeenCalled();
    });

    it('calls console.info for info level', () => {
      loggerDev.info('test info');
      expect(console.info).toHaveBeenCalledWith('test info');
    });

    it('calls console.debug for debug level', () => {
      loggerDev.debug('test debug');
      expect(console.debug).toHaveBeenCalledWith('test debug');
    });
  });

  describe('in production (__DEV__ = false)', () => {
    let loggerProd: typeof import('../logger').logger;
    let SentryProd: typeof import('@sentry/react-native');

    beforeAll(() => {
      jest.isolateModules(() => {
        (globalThis as Record<string, unknown>).__DEV__ = false;
        loggerProd = require('../logger').logger;
        SentryProd = require('@sentry/react-native');
      });
    });

    it('does not call console.log', () => {
      loggerProd.log('should not appear');
      expect(console.log).not.toHaveBeenCalled();
    });

    it('does not call console.warn', () => {
      loggerProd.warn('should not appear');
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('does not call console.info', () => {
      loggerProd.info('should not appear');
      expect(console.info).not.toHaveBeenCalled();
    });

    it('does not call console.debug', () => {
      loggerProd.debug('should not appear');
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('always calls console.error and Sentry.captureException for Error instances', () => {
      const err = new Error('boom');
      loggerProd.error(err);
      expect(console.error).toHaveBeenCalledWith(err);
      expect(SentryProd.captureException).toHaveBeenCalledWith(err);
    });

    it('always calls console.error and Sentry.captureMessage for non-Error values', () => {
      loggerProd.error('string error');
      expect(console.error).toHaveBeenCalledWith('string error');
      expect(SentryProd.captureMessage).toHaveBeenCalledWith('string error', 'error');
    });
  });
});
