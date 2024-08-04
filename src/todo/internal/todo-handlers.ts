import {
  HttpRouter,
  HttpServerResponse,
  HttpServerRequest,
} from "@effect/platform";
import { Effect } from "effect";
import { ObjectId } from "mongodb";
import { TodoCommandRepository } from "./repository/todo-command-repository";
import { TodoQueryRepository } from "./repository/todo-query-repository";
import { TodoId, TodoRequestDto } from "./todo-domain";
import { Schema } from "@effect/schema";

export const getTodoByIdHandler = Effect.gen(function* () {
  const params = yield* HttpRouter.params;
  const id = yield* Schema.decodeUnknown(TodoId)(params.id);
  const svc = yield* TodoQueryRepository;
  const result = yield* svc.read(ObjectId.createFromHexString(id));
  return result === null
    ? HttpServerResponse.empty({ status: 404 })
    : HttpServerResponse.unsafeJson(result);
}).pipe(Effect.withSpan("getTodoByIdHandler"));

export const getAllTodosHandler = Effect.gen(function* () {
  const svc = yield* TodoQueryRepository;
  const result = yield* svc.readMany();
  return yield* HttpServerResponse.unsafeJson(result);
}).pipe(Effect.withSpan("getAllTodosHandler"));

export const createTodoHandler = Effect.gen(function* () {
  const svc = yield* TodoCommandRepository;
  const request = yield* HttpServerRequest.HttpServerRequest;
  const body = yield* request.json;
  const dto = yield* Schema.decodeUnknown(TodoRequestDto)(body);
  const result = yield* svc.create(dto);
  return HttpServerResponse.unsafeJson(result);
}).pipe(Effect.withSpan("createTodoHandler"));

export const updateTodoHandler = Effect.gen(function* () {
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

export const deleteTodoHandler = Effect.gen(function* () {
  const svc = yield* TodoCommandRepository;
  const params = yield* HttpRouter.params;
  const id = yield* Schema.decodeUnknown(TodoId)(params.id);
  const result = yield* svc.delete(ObjectId.createFromHexString(id));
  return result.deletedCount === 0
    ? HttpServerResponse.empty({ status: 404 })
    : HttpServerResponse.empty({ status: 204 });
}).pipe(Effect.withSpan("deleteTodoHandler"));