require('@testing-library/jest-dom')

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock localStorage with proper store
const localStorageStore = {};
const localStorageMock = {
  getItem: jest.fn((key) => localStorageStore[key] ?? null),
  setItem: jest.fn((key, value) => {
    localStorageStore[key] = String(value);
  }),
  removeItem: jest.fn((key) => {
    delete localStorageStore[key];
  }),
  clear: jest.fn(() => {
    Object.keys(localStorageStore).forEach((key) => {
      delete localStorageStore[key];
    });
  }),
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Suppress console errors/warnings in tests unless explicitly needed
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError.call(console, ...args)
  })
})

afterAll(() => {
  console.error = originalError
})
