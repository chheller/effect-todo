import { Config, type Redacted } from "effect";
function MongoConfig([user, pwd, host, port, database]: [
  user: string,
  pwd: Redacted.Redacted<string>,
  host: string,
  port: number,
  database: string,
]) {
  function getMongoUri() {
    return `mongodb://${host}:${port}/${database}`;
  }
  return { getMongoUri, user, pwd, host, port };
}

const mongoServerConfig = Config.all([
  Config.string("HOST").pipe(Config.withDefault("localhost")),
  Config.number("PORT").pipe(Config.withDefault(27017)),
  Config.string("DATABASE").pipe(Config.withDefault("effect")),
]);

const mongoUserConfig = Config.all([
  Config.string("USER"),
  Config.redacted("PWD"),
]);

export const MongoReaderConfigLive: Config.Config<MongoConfig> = Config.map(
  Config.zip(Config.nested(mongoUserConfig, "MONGO_READER"), mongoServerConfig),
  (configs) => MongoConfig([...configs[0], ...configs[1]]),
);

export const MongoWriterConfigLive: Config.Config<MongoConfig> = Config.map(
  Config.zip(Config.nested(mongoUserConfig, "MONGO_WRITER"), mongoServerConfig),
  (configs) => MongoConfig([...configs[0], ...configs[1]]),
);

export type MongoConfig = ReturnType<typeof MongoConfig>;