import type { Config } from 'jest'

const config: Config = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
      testMatch: [
        '<rootDir>/src/app/api/**/__tests__/**/*.test.ts',
        '<rootDir>/src/lib/__tests__/**/*.test.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      setupFiles: ['<rootDir>/jest.setup.env.ts'],
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jest-environment-jsdom',
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
      testMatch: ['<rootDir>/src/components/__tests__/**/*.test.tsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.dom.ts'],
    },
  ],
}

export default config
