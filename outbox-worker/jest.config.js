const config = {
  clearMocks: true,
  coverageProvider: "v8",
  preset: "ts-jest/presets/default-esm",
  moduleNameMapper: {
    "^(\\.\\.?/.*)\\.js$": "$1",
  },
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["**/*.test.ts"],
};

export default config;
