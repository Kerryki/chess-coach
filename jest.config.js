const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  moduleDirectories: ['node_modules', '<rootDir>'],
  collectCoverageFrom: [
    'lib/**/*.{js,jsx,ts,tsx}',
    '!lib/**/*.d.ts',
    '!lib/**/*.stories.{js,jsx,ts,tsx}',
    '!lib/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '**/__tests__/unit/**/*.(test|spec).ts?(x)',
    '**/__tests__/integration/**/*.(test|spec).ts?(x)',
  ],
  testPathIgnorePatterns: [
    '/__tests__/e2e/',
    '/node_modules/',
    '/.next/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
