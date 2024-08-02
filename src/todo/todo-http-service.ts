import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { Schema } from "@effect/schema";
import { Effect } from "effect";
import { HttpErrorHandlers } from "../http/error-handler";
import { ObjectId } from "mongodb";
import { TodoCommandRepository } from "./repository/todo-command-repository";
import { TodoQueryRepository } from "./repository/todo-query-repository";
import { TodoId, TodoRequestDto } from "./todo-domain";

const getTodoByIdHandler = Effect.gen(function* () {
  const params = yield* HttpRouter.params;
  const id = yield* Schema.decodeUnknown(TodoId)(params.id);
  const svc = yield* TodoQueryRepository;
  const result = yield* svc.read(ObjectId.createFromHexString(id));
  return result === null
    ? HttpServerResponse.empty({ status: 404 })
    : HttpServerResponse.unsafeJson(result);
}).pipe(Effect.withSpan("getTodoByIdHandler"));

const getAllTodosHandler = Effect.gen(function* () {
  const svc = yield* TodoQueryRepository;
  const result = yield* svc.readMany();
  return yield* HttpServerResponse.unsafeJson(result);
}).pipe(Effect.withSpan("getAllTodosHandler"));

const createTodoHandler = Effect.gen(function* () {
  const svc = yield* TodoCommandRepository;
  const request = yield* HttpServerRequest.HttpServerRequest;
  const body = yield* request.json;
  const dto = yield* Schema.decodeUnknown(TodoRequestDto)(body);
  const result = yield* svc.create(dto);
  return HttpServerResponse.unsafeJson(result);
}).pipe(Effect.withSpan("createTodoHandler"));

const updateTodoHandler = Effect.gen(function* () {
  const svc = yield* TodoCommandRepository;
  const request = yield* HttpServerRequest.HttpServerRequest;
  const body = yield* request.json;
  const params = yield* HttpRouter.params;
  const id = yield* Schema.decodeUnknown(TodoId)(params.id);
  const dto = yield* Schema.decodeUnknown(TodoRequestDto)(body);
  const result = yield* svc.update(ObjectId.createFromHexString(id), dto);

  return result.matchedCount === 0
    ? HttpServerResponse.empty({ status: 404 })
    : HttpServerResponse.unsafeJson(result);
}).pipe(Effect.withSpan("updateTodoHandler"));

const deleteTodoHandler = Effect.gen(function* () {
  const svc = yield* TodoCommandRepository;
  const params = yield* HttpRouter.params;
  const id = yield* Schema.decodeUnknown(TodoId)(params.id);
  const result = yield* svc.delete(ObjectId.createFromHexString(id));
  return result.deletedCount === 0
    ? HttpServerResponse.empty({ status: 404 })
    : HttpServerResponse.empty({ status: 204 });
}).pipe(Effect.withSpan("deleteTodoHandler"));

export const TodoHttpLive = HttpRouter.empty.pipe(
  HttpRouter.get("/", getAllTodosHandler),
  HttpRouter.get("/:id", getTodoByIdHandler),
  HttpRouter.post("/", createTodoHandler),
  HttpRouter.patch("/:id", updateTodoHandler),
  HttpRouter.del("/:id", deleteTodoHandler),
);
