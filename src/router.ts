import { HttpRouter } from "@effect/platform";
import { TodoHttpLive } from "./todo/todo-router";
import { HttpErrorHandlers } from "./http/error-handler";

export const router = HttpRouter.empty.pipe(
  HttpRouter.mount("/todo", TodoHttpLive),
  HttpRouter.catchTags({
    ParseError: HttpErrorHandlers.handleParseError,
    NoSuchElementException: HttpErrorHandlers.handleNoSuchElementError,
  }),
  HttpRouter.catchAll(HttpErrorHandlers.handleInternalServerError),
);