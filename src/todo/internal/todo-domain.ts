import { Schema as S } from "@effect/schema";
import { Model } from "@effect/sql";
import { ObjectIdField } from "../../database/object-id.schema";
import { SearchModel } from "../../http/search-schema";
import { UserIdSchema } from "../../auth/auth0";
import { PaginatedResponseModel } from "../../http/paginated-response";

export class GenericTodoRepoError extends Error {
  _tag = "GenericTodoRepoError" as const;
  public constructor(e: unknown) {
    super(
      e instanceof Error
        ? e.message
        : `Wrapped exception was not an exception: ${e}`,
    );
    this.name = this._tag;
  }
}
export class TodoModel extends Model.Class<TodoModel>("TodoModel")({
  description: S.String.pipe(S.minLength(1)),
  userId: Model.GeneratedByApp(UserIdSchema),
  done: S.Boolean,
  _id: ObjectIdField,
}) {}

export class SearchTodoModel extends SearchModel.extend<SearchTodoModel>(
  "SearchTodoModel",
)({
  match: S.Struct({
    description: S.optional(S.String),
    userId: S.optional(UserIdSchema),
    done: S.optional(S.Boolean),
  }),
}) {}

export class PaginatedTodoResponse extends Model.Class<PaginatedTodoResponse>(
  "PaginatedTodoResponse",
)({
  ...Model.fields(PaginatedResponseModel),
  items: Model.Field({
    select: S.Array(TodoModel.select),
    json: S.Array(TodoModel.json),
  }),
}) {}