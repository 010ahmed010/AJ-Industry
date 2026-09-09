import { MongoClient, type Db } from "mongodb";

let client: MongoClient | undefined;
let database: Db | undefined;
let connectionPromise: Promise<Db> | undefined;

export async function getMongoDb(): Promise<Db> {
  if (database) {
    return database;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not configured");
    }

    const nextClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await nextClient.connect();
    client = nextClient;
    database = nextClient.db(process.env.MONGODB_DB_NAME ?? "aj_industry");
    return database;
  })().catch((error) => {
    connectionPromise = undefined;
    client = undefined;
    database = undefined;
    throw error;
  });

  return connectionPromise;
}