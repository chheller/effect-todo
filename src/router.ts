import { HttpRouter } from "@effect/platform";
import { Effect } from "effect";
import { HttpErrorHandlers } from "./http/error-handler";
import { TodoHttpHandlers } from "./todo/internal/todo-handlers";

export const makeBaseRouter = Effect.gen(function* () {
  const todoHttpHandlers = yield* TodoHttpHandlers;
  return HttpRouter.empty.pipe(
    HttpRouter.mount("/todo", todoHttpHandlers),
    HttpRouter.catchTags({
      ParseError: HttpErrorHandlers.handleParseError,
      NoSuchElementException: HttpErrorHandlers.handleNoSuchElementError,
    }),
    HttpRouter.catchAll(HttpErrorHandlers.handleInternalServerError),
  );
});