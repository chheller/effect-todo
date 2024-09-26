import { Schema } from "@effect/schema";

export class PaginationRequestSchema extends Schema.Class<PaginationRequestSchema>(
  "PaginationRequestSchema",
)({
  page: Schema.Int.pipe(Schema.greaterThan(0)),
  limit: Schema.Int,
}) {}

export type PaginationProps = typeof PaginationRequestSchema.Type;