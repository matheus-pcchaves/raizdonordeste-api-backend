import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: ['**/tests/unit/**/*.spec.ts'],
  moduleNameMapper: {
    // Aliases TypeScript explícitos
    '^@domain/(.*)$': '<rootDir>/domain/$1',
    '^@application/(.*)$': '<rootDir>/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@api/(.*)$': '<rootDir>/api/$1',
    // Resolve imports relativos cruzando camadas (ex: ../../domain/* de dentro de application/)
    '^(\\.\\./)+domain/(.*)$': '<rootDir>/domain/$2',
    '^(\\.\\./)+application/(.*)$': '<rootDir>/application/$2',
    '^(\\.\\./)+infrastructure/(.*)$': '<rootDir>/infrastructure/$2',
  },
  // moduleDirectories garante que node_modules e a raiz src/ sejam buscados
  moduleDirectories: ['node_modules', '<rootDir>/..', '<rootDir>'],
  collectCoverageFrom: [
    '<rootDir>/domain/**/*.ts',
    '<rootDir>/application/**/*.ts',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        diagnostics: {
          // Permite compilar mesmo com erros de paths não-resolvidos pelo ts
          ignoreCodes: ['TS2307'],
        },
      },
    ],
  },
  verbose: true,
};

export default config;
