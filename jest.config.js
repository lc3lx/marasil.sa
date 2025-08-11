module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  verbose: true,
  setupFilesAfterEnv: ["./tests/setup.js"],
  transform: {
    "^.+\\.js$": "babel-jest",
  },
};
