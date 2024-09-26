import type { SearchSchema } from "../http/search-schema";

export const makePaginatedSearchAggregation = (search: SearchSchema) => {
  return [
    {
      $facet: {
        metadata: [
          { $count: "total" },
          {
            $addFields: {
              page: search.pagination.page,
              limit: search.pagination.limit,
            },
          },
        ],
        items: [
          { $skip: (search.pagination.page - 1) * search.pagination.limit },
          { $limit: search.pagination.limit },
          {
            $sort: {
              [search.sort.field]: search.sort.direction,
            },
          },
        ],
      },
    },

    {
      $project: {
        metadata: {
          $ifNull: [
            { $first: "$metadata" },
            {
              total: 0,
              page: search.pagination.page,
              limit: search.pagination.limit,
            },
          ],
        },
        items: 1,
      },
    },
  ] as const;
};

export type PaginatedSearch = {
  metadata: {
    total: number;
    page: number;
    limit: number;
  };
  items: unknown[];
};