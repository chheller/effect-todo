
import { test, expect } from "bun:test";

class Test {
  private state: string;
  constructor() {
    this.state = "test";
  }
  public getState() {
    return this.state;
  }
}

const testFn = (test: Test) => (f: (test: Test) => any) => f(test);
test("It should fail to find this when destructuring from a class", () => {
  const test = new Test();
  const t = testFn(test);
  expect(() => t(({ getState }) => getState())).toThrow();
});

function TestClosure() {
  const state = "test";
  return {
    getState: () => state,
  };
}

const testClosure =
  (test: ReturnType<typeof TestClosure>) =>
  (f: (test: ReturnType<typeof TestClosure>) => any) =>
    f(test);

test("It should not throw if destructuring from a functional closure", () => {
  const test = TestClosure();
  const t = testClosure(test);
  expect(t(({ getState }) => getState())).toBe("test");
});