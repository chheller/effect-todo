import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { Schema } from "@effect/schema";
import { Effect } from "effect";
import { HttpErrorHandlers } from "../http/error-handler";
import { Todo } from "./todo-service";
import { ObjectId } from "mongodb";

const getTodoByIdHandler = Effect.gen(function* () {
  const params = yield* HttpRouter.params;
  const id = yield* Schema.decodeUnknown(Todo.TodoId)(params.id);
  const svc = yield* Todo.TodoCrudService;
  const result = yield* svc.read(ObjectId.createFromHexString(id));
  return result === null
    ? HttpServerResponse.empty({ status: 404 })
    : HttpServerResponse.unsafeJson(result);
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

const updateTodoHandler = Effect.gen(function* () {
  const svc = yield* Todo.TodoCrudService;
  const request = yield* HttpServerRequest.HttpServerRequest;
  const body = yield* request.json;
  const params = yield* HttpRouter.params;
  const id = yield* Schema.decodeUnknown(Todo.TodoId)(params.id);
  const dto = yield* Schema.decodeUnknown(Todo.TodoRequestDto)(body);
  const result = yield* svc.update(ObjectId.createFromHexString(id), dto);
  return result.matchedCount === 0
    ? HttpServerResponse.empty({ status: 404 })
    : HttpServerResponse.unsafeJson(result);
}).pipe(
  Effect.catchTags({
    GenericTodoRepoError: HttpErrorHandlers.handleInternalServerError,
    RequestError: HttpErrorHandlers.handleInternalServerError,
    ParseError: HttpErrorHandlers.handleParseError,
  }),
);

const deleteTodoHandler = Effect.gen(function* () {
  const svc = yield* Todo.TodoCrudService;
  const params = yield* HttpRouter.params;
  const id = yield* Schema.decodeUnknown(Todo.TodoId)(params.id);
  const result = yield* svc.delete(ObjectId.createFromHexString(id));
  return result.deletedCount === 0
    ? HttpServerResponse.empty({ status: 404 })
    : HttpServerResponse.empty({ status: 204 });
}).pipe(
  Effect.catchTags({
    GenericTodoRepoError: HttpErrorHandlers.handleInternalServerError,
    ParseError: HttpErrorHandlers.handleParseError,
  }),
);
export const TodoHttpLive = HttpRouter.empty.pipe(
  HttpRouter.get("/", getAllTodosHandler),
  HttpRouter.get("/:id", getTodoByIdHandler),
  HttpRouter.post("/", createTodoHandler),
  HttpRouter.patch("/:id", updateTodoHandler),
  HttpRouter.del("/:id", deleteTodoHandler),
);
