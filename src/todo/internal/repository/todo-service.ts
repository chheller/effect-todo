import { Effect } from "effect";


const makeSearchService = Effect.gen(function*() {
  const repo = yield* TodoQueryRepository;

  const search = 
})