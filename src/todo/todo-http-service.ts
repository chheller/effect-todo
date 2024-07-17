import { HttpRouter, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";
import { TodoCrudService } from "./todo-service";

export const TodoHttpLive = HttpRouter.empty.pipe(
	HttpRouter.get(
		"/",
		Effect.gen(function* () {
			const svc = yield* TodoCrudService;
			return yield* HttpServerResponse.json(yield* svc.readMany());
		}),
	),
);