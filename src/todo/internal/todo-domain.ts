import { Schema as S } from "@effect/schema";
import { Model } from "@effect/sql";
import { UserIdSchema } from "../../auth/auth0";
import { ObjectIdField, ObjectIdSchema } from "../../database/object-id.schema";
import { PaginatedResponseModel } from "../../http/paginated-response";
import { SearchSchema } from "../../http/search-schema";

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

export class SearchTodoSchema extends SearchSchema.extend<SearchTodoSchema>(
  "SearchTodoSchema ",
)({
  match: S.Struct({
    _id: S.optional(ObjectIdSchema),
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