import { HttpRouter } from "@effect/platform";
import {
  createTodoHandler,
  deleteTodoHandler,
  getAllTodosHandler,
  getTodoByIdHandler,
  updateTodoHandler,
} from "./internal/todo-handlers";

export const TodoHttpLive = HttpRouter.empty.pipe(
  HttpRouter.get("/", getAllTodosHandler),
  HttpRouter.get("/:id", getTodoByIdHandler),
  HttpRouter.post("/", createTodoHandler),
  HttpRouter.patch("/:id", updateTodoHandler),
  HttpRouter.del("/:id", deleteTodoHandler),
);
