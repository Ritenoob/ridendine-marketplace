/**
 * @jest-environment jsdom
 */

// Uses jest.isolateModules so each test gets a fresh module (fresh audioCtx = null).

describe('playNewOrderChime', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates an AudioContext and starts oscillators when AudioContext is available', async () => {
    const mockStart = jest.fn();
    const mockStop = jest.fn();
    const mockOscConnect = jest.fn();
    const mockGainConnect = jest.fn();
    const mockSetValueAtTime = jest.fn();
    const mockRampToValue = jest.fn();

    const MockAudioContext = jest.fn(() => ({
      state: 'running',
      currentTime: 0,
      destination: {},
      createOscillator: jest.fn(() => ({
        type: 'sine',
        frequency: { value: 0 },
        connect: mockOscConnect,
        start: mockStart,
        stop: mockStop,
      })),
      createGain: jest.fn(() => ({
        gain: {
          setValueAtTime: mockSetValueAtTime,
          exponentialRampToValueAtTime: mockRampToValue,
        },
        connect: mockGainConnect,
      })),
      resume: jest.fn().mockResolvedValue(undefined),
    }));

    Object.defineProperty(window, 'AudioContext', {
      value: MockAudioContext,
      writable: true,
      configurable: true,
    });

    let playChime: () => void;
    jest.isolateModules(() => {
      // Fresh module import so audioCtx starts null
      ({ playNewOrderChime: playChime } = require('../sound') as { playNewOrderChime: () => void });
    });

    playChime!();

    // Oscillators are created inside a .then() - flush microtasks
    await new Promise<void>((r) => setTimeout(r, 10));

    // Two tones = two oscillators each started and stopped
    expect(mockStart).toHaveBeenCalledTimes(2);
    expect(mockStop).toHaveBeenCalledTimes(2);
  });

  it('does not throw when AudioContext is unavailable', () => {
    Object.defineProperty(window, 'AudioContext', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    let playChime: () => void;
    jest.isolateModules(() => {
      ({ playNewOrderChime: playChime } = require('../sound') as { playNewOrderChime: () => void });
    });

    expect(() => playChime!()).not.toThrow();
  });
});
