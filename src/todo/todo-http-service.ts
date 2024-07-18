import {
	HttpRouter,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import { Schema } from "@effect/schema";
import { Effect } from "effect";
import { HttpErrorHandlers } from "../http/error-handler";
import { Todo } from "./todo-service";

const getTodoByIdHandler = Effect.gen(function* () {
	const params = yield* HttpRouter.params;
	const id = yield* Schema.decodeUnknown(Todo.TodoId)(params.id);
	const svc = yield* Todo.TodoCrudService;
	const result = yield* svc.read(id);
	return HttpServerResponse.unsafeJson(result);
}).pipe(
	Effect.catchTags({
		GenericTodoRepoError: HttpErrorHandlers.handleInternalServerError,
		ParseError: HttpErrorHandlers.handleParseError,
	}),
);

const getAllTodosHandler = Effect.gen(function* () {
	const svc = yield* Todo.TodoCrudService;
	const result = yield* svc.readMany();
	return yield* HttpServerResponse.unsafeJson(result);
}).pipe(
	Effect.catchTags({
		GenericTodoRepoError: HttpErrorHandlers.handleInternalServerError,
	}),
);

const createTodoHandler = Effect.gen(function* () {
	const svc = yield* Todo.TodoCrudService;
	const request = yield* HttpServerRequest.HttpServerRequest;
	const body = yield* request.json;
	const dto = yield* Schema.decodeUnknown(Todo.TodoRequestDto)(body);
	const result = yield* svc.create(dto);
	return HttpServerResponse.unsafeJson(result);
}).pipe(
	Effect.catchTags({
		GenericTodoRepoError: HttpErrorHandlers.handleInternalServerError,
		RequestError: HttpErrorHandlers.handleInternalServerError,
		ParseError: HttpErrorHandlers.handleParseError,
	}),
);

export const TodoHttpLive = HttpRouter.empty.pipe(
	HttpRouter.get("/", getAllTodosHandler),
	HttpRouter.get("/:id", getTodoByIdHandler),
	HttpRouter.post("/", createTodoHandler),
);
