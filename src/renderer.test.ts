// @ts-nocheck

jest.mock("./index.css", () => ({}));

const mockConsoleLog = jest.fn();

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(mockConsoleLog);
});

afterAll(() => {
  (console.log as jest.Mock).mockRestore();
});

describe("renderer", () => {
  it("should log the expected message and import css without throwing", () => {
    expect(() => {
      require("./renderer");
    }).not.toThrow();
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '👋 This message is being logged by "renderer.ts", included via Vite',
    );
  });
});
