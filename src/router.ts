import { HttpRouter } from "@effect/platform";
import { TodoHttpLive } from "./todo/todo-http-service";
import { Effect } from "effect";
import { HttpErrorHandlers } from "./http/error-handler";

export const router = HttpRouter.empty.pipe(
  HttpRouter.mount("/todo", TodoHttpLive),
  HttpRouter.catchTags({
    ParseError: HttpErrorHandlers.handleParseError,
  }),
  HttpRouter.catchAll(HttpErrorHandlers.handleInternalServerError),
);