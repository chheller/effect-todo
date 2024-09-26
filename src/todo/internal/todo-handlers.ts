import {
  HttpRouter,
  HttpServerResponse,
  HttpServerRequest,
} from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { TodoCommandRepository } from "./repository/todo-command-repository";
import { TodoQueryRepository } from "./repository/todo-query-repository";
import { TodoId, TodoRequestDto } from "./todo-domain";
import { Schema } from "@effect/schema";
import type { ParseError } from "@effect/schema/ParseResult";
import { TodoRepositoryLive } from "./repository/todo-repository";
import { AuthorizationToken } from "../../auth/auth0";

import type { NoSuchElementException } from "effect/Cause";
import type { GenericMongoDbException } from "../../database/mongo-database-provider";
import type { RequestError } from "@effect/platform/HttpServerError";

const make = Effect.gen(function* () {
  const readRepository = yield* TodoQueryRepository;
  const writeRepository = yield* TodoCommandRepository;

  const getTodoByIdHandler = Effect.gen(function* () {
    const token = yield* AuthorizationToken;
    const params = yield* HttpRouter.params;
    const id = yield* Schema.decodeUnknown(TodoId)(params.id);
    const result = yield* readRepository.read(ObjectId.createFromHexString(id));
    return HttpServerResponse.unsafeJson(result);
  }).pipe(Effect.withSpan("getTodoByIdHandler"));

  const getAllTodosHandler = Effect.gen(function* () {
    const result = yield* readRepository.readMany();
    return yield* HttpServerResponse.unsafeJson(result);
  }).pipe(Effect.withSpan("getAllTodosHandler"));

  const createTodoHandler = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const body = yield* request.json;
    const dto = yield* Schema.decodeUnknown(TodoRequestDto)(body);
    const result = yield* writeRepository.create(dto);
    return HttpServerResponse.unsafeJson(result);
  }).pipe(Effect.withSpan("createTodoHandler"));

  const updateTodoHandler = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const body = yield* request.json;
    const params = yield* HttpRouter.params;
    const id = yield* Schema.decodeUnknown(TodoId)(params.id);
    const dto = yield* Schema.decodeUnknown(TodoRequestDto)(body);
    const result = yield* writeRepository.update(
      ObjectId.createFromHexString(id),
      dto,
    );

    return HttpServerResponse.unsafeJson(result);
  }).pipe(Effect.withSpan("updateTodoHandler"));

  const deleteTodoHandler = Effect.gen(function* () {
    const params = yield* HttpRouter.params;
    const id = yield* Schema.decodeUnknown(TodoId)(params.id);
    yield* writeRepository.delete(ObjectId.createFromHexString(id));
    return HttpServerResponse.empty({ status: 204 });
  }).pipe(Effect.withSpan("deleteTodoHandler"));

  return HttpRouter.empty.pipe(
    HttpRouter.get("/", getAllTodosHandler),
    HttpRouter.get("/:id", getTodoByIdHandler),
    HttpRouter.post("/", createTodoHandler),
    HttpRouter.patch("/:id", updateTodoHandler),
    HttpRouter.del("/:id", deleteTodoHandler),
  );
});

export class TodoHttpHandlers extends Context.Tag("TodoHttpHandlers")<
  TodoHttpHandlers,
  HttpRouter.HttpRouter<
    | ParseError
    | RequestError
    | NoSuchElementException
    | GenericMongoDbException,
    AuthorizationToken
  >
>() {
  static Layer = Layer.effect(this, make);
  static Live = Layer.provide(this.Layer, TodoRepositoryLive);
}