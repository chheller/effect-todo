import { Layer } from "effect";
import { TodoQueryRepository } from "./todo-query-repository";
import { TodoCommandRepository } from "./todo-command-repository";

export const TodoRepositoryLive = Layer.merge(
  TodoQueryRepository.Live,
  TodoCommandRepository.Live,
);