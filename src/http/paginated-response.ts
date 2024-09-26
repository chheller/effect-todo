import { Schema } from "@effect/schema";
import { Model } from "@effect/sql";

export class PaginatedResponseModel extends Model.Class<PaginatedResponseModel>(
  "PaginatedResponseModel",
)({
  metadata: Schema.Struct({
    total: Schema.Number,
    page: Schema.Positive,
    limit: Schema.Positive,
  }),
}) {}


