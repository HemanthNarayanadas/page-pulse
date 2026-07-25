module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/types/**'],
  coverageThreshold: {
    global: { branches: 55, functions: 70, lines: 70, statements: 70 }
  },
  setupFiles: ['dotenv/config'],
  testEnvironment: 'node'
};
