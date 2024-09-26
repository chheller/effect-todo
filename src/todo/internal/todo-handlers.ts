import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { Schema } from "@effect/schema";
import type { ParseError } from "@effect/schema/ParseResult";
import { Context, Effect, Layer } from "effect";
import { AuthorizationToken } from "../../auth/auth0";
import { TodoCommandRepository } from "./repository/todo-command-repository";
import { TodoQueryRepository } from "./repository/todo-query-repository";
import { TodoRepositoryLive } from "./repository/todo-repository";

import type { RequestError } from "@effect/platform/HttpServerError";
import { NoSuchElementException } from "effect/Cause";
import type { GenericMongoDbException } from "../../database/mongo-database-provider";
import { ObjectIdUrlParamSchema } from "../../database/object-id.schema";
import { PaginationSearchParamsSchema } from "../../http/pagination";
import { SortRequestSchema } from "../../http/sort";
import {
  PaginatedTodoResponse,
  SearchTodoModel,
  TodoModel,
} from "./todo-domain";

const make = Effect.gen(function* () {
  const readRepository = yield* TodoQueryRepository;
  const writeRepository = yield* TodoCommandRepository;

  const getTodoByIdHandler = Effect.gen(function* () {
    const id = yield* HttpRouter.schemaPathParams(ObjectIdUrlParamSchema);
    const result = yield* readRepository.search(
      new SearchTodoModel({ match: { _id: id } }),
    );
    if (result.items.length === 0)
      return yield* new NoSuchElementException(`No such todo with _id ${id}`);
    const encoded = yield* Schema.encode(TodoModel.json)(result.items[0]);
    return HttpServerResponse.unsafeJson(encoded);
  }).pipe(Effect.withSpan("getTodoByIdHandler"));

  const searchTodos = Effect.gen(function* () {
    const search = yield* HttpServerRequest.schemaBodyJson(SearchTodoModel);
    const result = yield* readRepository.search(search);
    const encoded = yield* Schema.encode(PaginatedTodoResponse.json)(result);
    return yield* HttpServerResponse.unsafeJson(encoded);
  }).pipe(Effect.withSpan("getAllTodosHandler"));

  const getAllTodosHandler = Effect.gen(function* () {
    const pagination = yield* HttpServerRequest.schemaSearchParams(
      PaginationSearchParamsSchema,
    );
    const sort = yield* HttpServerRequest.schemaSearchParams(SortRequestSchema);
    const search = { match: {}, pagination, sort };
    const result = yield* readRepository.search(new SearchTodoModel(search));
    const encoded = yield* Schema.encode(PaginatedTodoResponse.json)(result);
    return yield* HttpServerResponse.unsafeJson(encoded);
  }).pipe(Effect.withSpan("getAllTodosHandler"));

  const createTodoHandler = Effect.gen(function* () {
    const token = yield* AuthorizationToken;
    const dto = yield* HttpServerRequest.schemaBodyJson(TodoModel.jsonCreate);
    const result = yield* writeRepository.create(token.payload.sub, dto);
    const encoded = yield* Schema.encode(TodoModel.json)(result);
    return HttpServerResponse.unsafeJson(encoded);
  }).pipe(Effect.withSpan("createTodoHandler"));

  const updateTodoHandler = Effect.gen(function* () {
    const token = yield* AuthorizationToken;
    const dto = yield* HttpServerRequest.schemaBodyJson(TodoModel.jsonUpdate);
    const id = yield* HttpRouter.schemaPathParams(ObjectIdUrlParamSchema);
    const result = yield* writeRepository.update(id, token.payload.sub, dto);
    const encoded = yield* Schema.encode(TodoModel.json)(result);
    return HttpServerResponse.unsafeJson(encoded);
  }).pipe(Effect.withSpan("updateTodoHandler"));

  const deleteTodoHandler = Effect.gen(function* () {
    const id = yield* HttpRouter.schemaPathParams(ObjectIdUrlParamSchema);
    yield* writeRepository.delete(id);
    return HttpServerResponse.empty({ status: 204 });
  }).pipe(Effect.withSpan("deleteTodoHandler"));

  return HttpRouter.empty.pipe(
    HttpRouter.get("/", getAllTodosHandler),
    HttpRouter.get("/:id", getTodoByIdHandler),
    HttpRouter.post("/search", searchTodos),
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
