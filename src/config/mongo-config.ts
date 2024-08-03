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


const mongoUserConfig = Config.all([
  Config.string("USER"),
  Config.redacted("PWD"),
  Config.string("HOST").pipe(Config.withDefault("host.docker.internal")),
  Config.number("PORT").pipe(Config.withDefault(27017)),
  Config.string("DATABASE").pipe(Config.withDefault("effect")),
]);

export const makeMongoConfig: (
  mongoSvcName: string,
) => Config.Config<MongoConfig> = (mongoSvcName: string) =>
  Config.map(Config.nested(mongoUserConfig, mongoSvcName), MongoConfig);


export type MongoConfig = ReturnType<typeof MongoConfig>;