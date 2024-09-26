import { Layer } from "effect";
import { TodoCommandRepository } from "./todo-command-repository";
import { TodoQueryRepository } from "./todo-query-repository";

export const TodoRepositoryLive = Layer.merge(
  TodoQueryRepository.Live,
  TodoCommandRepository.Live,
);