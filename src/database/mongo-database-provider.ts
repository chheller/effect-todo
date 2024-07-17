import { Context, Effect, Layer } from "effect";
import * as Mongo from "mongodb";
import { ConfigService } from "../config-service";
export interface MongoDatabaseProvider {
	readonly client: Mongo.MongoClient;
}
export const MongoDatabaseProvider = Context.GenericTag<MongoDatabaseProvider>(
	"MongoDatabaseProvider",
);

export const makeMongoDatabaseProvider = Effect.gen(function* () {
	const config = yield* ConfigService;

	const client = new Mongo.MongoClient(config.get().mongoDBURI);
	const connection = yield* Effect.tryPromise({
		try: () => client.connect(),
		catch: (e) => Effect.fail(e),
	});
	return MongoDatabaseProvider.of({ client });
});

export const MongoDatabaseProviderLive = Layer.scoped(
	MongoDatabaseProvider,
	makeMongoDatabaseProvider,
);