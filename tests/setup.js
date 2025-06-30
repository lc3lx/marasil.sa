// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock process.env
process.env.NODE_ENV = "test";

// Mock mongoose
jest.mock("mongoose", () => ({
  connect: jest.fn(),
  model: jest.fn(),
  Schema: jest.fn(),
}));

// Mock axios
jest.mock("axios", () => ({
  post: jest.fn(),
  get: jest.fn(),
}));
