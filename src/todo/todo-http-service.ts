import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { Schema } from "@effect/schema";
import { Effect } from "effect";
import { HttpErrorHandlers } from "../http/error-handler";
import { Todo } from "./todo-repository";
import { ObjectId } from "mongodb";

const getTodoByIdHandler = Effect.gen(function* () {
  const params = yield* HttpRouter.params;
  const id = yield* Schema.decodeUnknown(Todo.TodoId)(params.id);
  const svc = yield* Todo.TodoRepository;
  const result = yield* svc.read(ObjectId.createFromHexString(id));
  return result === null
    ? HttpServerResponse.empty({ status: 404 })
    : HttpServerResponse.unsafeJson(result);
});

const getAllTodosHandler = Effect.gen(function* () {
  const svc = yield* Todo.TodoRepository;
  const result = yield* svc.readMany();
  return yield* HttpServerResponse.unsafeJson(result);
});

const createTodoHandler = Effect.gen(function* () {
  const svc = yield* Todo.TodoRepository;
  const request = yield* HttpServerRequest.HttpServerRequest;
  const body = yield* request.json;
  const dto = yield* Schema.decodeUnknown(Todo.TodoRequestDto)(body);
  const result = yield* svc.create(dto);
  return HttpServerResponse.unsafeJson(result);
});

const updateTodoHandler = Effect.gen(function* () {
  const svc = yield* Todo.TodoRepository;
  const request = yield* HttpServerRequest.HttpServerRequest;
  const body = yield* request.json;
  const params = yield* HttpRouter.params;
  const id = yield* Schema.decodeUnknown(Todo.TodoId)(params.id);
  const dto = yield* Schema.decodeUnknown(Todo.TodoRequestDto)(body);
  const result = yield* svc.update(ObjectId.createFromHexString(id), dto);

  return result.matchedCount === 0
    ? HttpServerResponse.empty({ status: 404 })
    : HttpServerResponse.unsafeJson(result);
});

const deleteTodoHandler = Effect.gen(function* () {
  const svc = yield* Todo.TodoRepository;
  const params = yield* HttpRouter.params;
  const id = yield* Schema.decodeUnknown(Todo.TodoId)(params.id);
  const result = yield* svc.delete(ObjectId.createFromHexString(id));
  return result.deletedCount === 0
    ? HttpServerResponse.empty({ status: 404 })
    : HttpServerResponse.empty({ status: 204 });
});


export const TodoHttpLive = HttpRouter.empty.pipe(
  HttpRouter.get("/", getAllTodosHandler),
  HttpRouter.get("/:id", getTodoByIdHandler),
  HttpRouter.post("/", createTodoHandler),
  HttpRouter.patch("/:id", updateTodoHandler),
  HttpRouter.del("/:id", deleteTodoHandler),
);
