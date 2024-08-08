import * as B from "bun:test";
import {
  Cause,
  Duration,
  Effect,
  Exit,
  Layer,
  Logger,
  Schedule,
  type Scope,
  type TestServices,
  flow,
  identity,
  pipe,
} from "effect";
import * as TestEnvironment from "effect/TestContext";
// Copied and lightly ported to Bun from @effect/vitest
export namespace BunTest {
  /**
   * @since 1.0.0
   */

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  export type TestFunction<A, E, R, TestArgs extends Array<any>> = (
    ...args: TestArgs
  ) => Effect.Effect<A, E, R>;

  /**
   * @since 1.0.0
   */
  export type Test<R> = <A, E>(
    name: string,
    // biome-ignore lint/complexity/noBannedTypes: <explanation>
    self: TestFunction<A, E, R, [{}]>,
    timeout?: number | B.TestOptions,
  ) => void;

  /**
   * @since 1.0.0
   */
  export interface Tester<R> extends BunTest.Test<R> {
    skip: BunTest.Test<R>;

    only: BunTest.Test<R>;
    each: <T>(
      cases: Array<T>,
    ) => <A, E>(
      name: string,
      self: TestFunction<A, E, R, Array<T>>,
      timeout?: number | B.TestOptions,
    ) => void;
  }
}

const runTest = <E, A>(effect: Effect.Effect<A, E>) =>
  Effect.gen(function* () {
    const exit: Exit.Exit<A, E> = yield* Effect.exit(effect);
    if (Exit.isSuccess(exit)) {
      return () => {};
    }
    const errors = Cause.prettyErrors(exit.cause);
    for (let i = 1; i < errors.length; i++) {
      yield* Effect.logError(errors[i]);
    }
    return () => {
      throw errors[0];
    };
  })
    .pipe(Effect.runPromise)
    .then((f) => f());

const TestEnv = TestEnvironment.TestContext.pipe(
  Layer.provide(Logger.remove(Logger.defaultLogger)),
);

const makeTester = <R>(
  mapEffect: <A, E>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, never>,
): BunTest.Tester<R> => {
  const run =
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      <A, E, TestArgs extends Array<any>>(
        self: BunTest.TestFunction<A, E, R, TestArgs>,
      ) =>
      (...args: TestArgs) =>
        pipe(
          Effect.suspend(() => self(...args)),
          mapEffect,
          runTest,
        );

  const f: BunTest.Test<R> = (name, self, timeout) =>
    B.it(name, run(self), timeout);

  const skip: BunTest.Tester<R>["only"] = (name, self, timeout) =>
    B.it.skip(name, run(self), timeout);
  const only: BunTest.Tester<R>["only"] = (name, self, timeout) =>
    B.it.only(name, run(self), timeout);
  const each: BunTest.Tester<R>["each"] = (cases) => (name, self, timeout) =>
    B.it.each(cases)(name, run(self), timeout);

  return Object.assign(f, { skip, only, each });
};

/** @internal */
export const effect = makeTester<TestServices.TestServices>(
  Effect.provide(TestEnv),
);

/** @internal */
export const scoped = makeTester<TestServices.TestServices | Scope.Scope>(
  flow(Effect.scoped, Effect.provide(TestEnv)),
);

/** @internal */
export const live = makeTester<never>(identity);

/** @internal */
export const scopedLive = makeTester<Scope.Scope>(Effect.scoped);

/** @internal */
export const flakyTest = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeout: Duration.DurationInput = Duration.seconds(30),
) =>
  pipe(
    Effect.catchAllDefect(self, Effect.fail),
    Effect.retry(
      pipe(
        Schedule.recurs(10),
        Schedule.compose(Schedule.elapsed),
        Schedule.whileOutput(Duration.lessThanOrEqualTo(timeout)),
      ),
    ),
    Effect.orDie,
  );

export const it = Object.assign(B.it, {
  effect,
  live,
  flakyTest,
  scoped,
  scopedLive,
} as const);

export * from "bun:test";