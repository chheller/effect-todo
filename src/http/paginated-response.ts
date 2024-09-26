import { Schema } from "@effect/schema";
import { Model } from "@effect/sql";

export class PaginatedResponseModel extends Model.Class<PaginatedResponseModel>(
  "PaginatedResponseModel",
)({
  metadata: Schema.optionalWith(
    Schema.Struct({
      total: Schema.optionalWith(Schema.Number, { default: () => 0 }),
      page: Schema.optionalWith(Schema.Positive, { default: () => 1 }),
      limit: Schema.optionalWith(Schema.Positive, { default: () => 25 }),
    }),
    { default: () => ({ total: 0, limit: 25, page: 1 }) },
  ),
}) {}


