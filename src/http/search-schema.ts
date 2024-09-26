import { Schema } from "@effect/schema";
import { PaginationRequestSchema } from "./pagination";
import { SortRequestSchema } from "./sort";

export class SearchModel extends Schema.Class<SearchModel>("SearchSchema")({
  sort: Schema.optionalWith(SortRequestSchema, {
    default: () => new SortRequestSchema({ field: "_id", direction: -1 }),
  }),
  pagination: Schema.optionalWith(PaginationRequestSchema, {
    default: () => new PaginationRequestSchema({ limit: 25, page: 1 }),
  }),
}) {}