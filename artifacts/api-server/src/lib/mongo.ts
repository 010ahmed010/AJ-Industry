import { randomUUID } from "node:crypto";
import { MongoClient, type Db } from "mongodb";

let client: MongoClient | undefined;
let database: Db | undefined;
let connectionPromise: Promise<Db> | undefined;

// In-memory collection fallback for development without MongoDB instance
class InMemoryCollection {
  private docs: any[] = [];

  async insertOne(doc: any) {
    const docWithId = {
      _id: doc._id ?? randomUUID(),
      ...doc,
    };
    this.docs.push(docWithId);
    return { acknowledged: true, insertedId: docWithId._id };
  }

  async findOne(filter: Record<string, any>) {
    return (
      this.docs.find((d) =>
        Object.entries(filter).every(([k, v]) => d[k] === v),
      ) ?? null
    );
  }

  async updateOne(filter: Record<string, any>, update: any, options?: { upsert?: boolean }) {
    const index = this.docs.findIndex((d) =>
      Object.entries(filter).every(([k, v]) => d[k] === v),
    );
    if (index >= 0) {
      const doc = this.docs[index];
      if (update.$set) Object.assign(doc, update.$set);
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    }
    if (options?.upsert) {
      const newDoc: any = { _id: randomUUID(), ...filter };
      if (update.$setOnInsert) Object.assign(newDoc, update.$setOnInsert);
      if (update.$set) Object.assign(newDoc, update.$set);
      this.docs.push(newDoc);
      return { acknowledged: true, matchedCount: 0, upsertedId: newDoc._id };
    }
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
  }

  async replaceOne(filter: Record<string, any>, replacement: any, options?: { upsert?: boolean }) {
    const index = this.docs.findIndex((d) =>
      Object.entries(filter).every(([k, v]) => d[k] === v),
    );
    if (index >= 0) {
      const _id = this.docs[index]._id;
      this.docs[index] = { ...replacement, _id };
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    }
    if (options?.upsert) {
      const newDoc = { _id: randomUUID(), ...replacement };
      this.docs.push(newDoc);
      return { acknowledged: true, matchedCount: 0, upsertedId: newDoc._id };
    }
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
  }

  async deleteOne(filter: Record<string, any>) {
    const index = this.docs.findIndex((d) =>
      Object.entries(filter).every(([k, v]) => d[k] === v),
    );
    if (index >= 0) {
      this.docs.splice(index, 1);
      return { acknowledged: true, deletedCount: 1 };
    }
    return { acknowledged: true, deletedCount: 0 };
  }

  async deleteMany(filter: Record<string, any>) {
    const initialLen = this.docs.length;
    this.docs = this.docs.filter((d) =>
      !Object.entries(filter).every(([k, v]) => d[k] === v),
    );
    return { acknowledged: true, deletedCount: initialLen - this.docs.length };
  }

  async countDocuments(filter: Record<string, any> = {}) {
    return this.docs.filter((d) =>
      Object.entries(filter).every(([k, v]) => d[k] === v),
    ).length;
  }

  find(filter: Record<string, any> = {}) {
    let result = this.docs.filter((d) =>
      Object.entries(filter).every(([k, v]) => d[k] === v),
    );
    const cursor = {
      sort: (sortSpec: Record<string, number>) => {
        const [field, direction] = Object.entries(sortSpec)[0] ?? [];
        if (field) {
          result.sort((a, b) => {
            const valA = a[field];
            const valB = b[field];
            if (valA < valB) return direction === -1 ? 1 : -1;
            if (valA > valB) return direction === -1 ? -1 : 1;
            return 0;
          });
        }
        return cursor;
      },
      limit: (count: number) => {
        result = result.slice(0, count);
        return cursor;
      },
      toArray: async () => [...result],
    };
    return cursor;
  }
}

class InMemoryDb {
  private collections = new Map<string, InMemoryCollection>();

  collection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new InMemoryCollection());
    }
    return this.collections.get(name) as any;
  }
}

const inMemoryFallbackDb = new InMemoryDb() as unknown as Db;

export async function getMongoDb(): Promise<Db> {
  if (database) {
    return database;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // Graceful in-memory fallback when MongoDB URI is not configured
    return inMemoryFallbackDb;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      const nextClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      await nextClient.connect();
      client = nextClient;
      database = nextClient.db(process.env.MONGODB_DB_NAME ?? "aj_industry");
      return database;
    } catch (err) {
      console.warn("[Mongo] Connection failed, using in-memory store:", err);
      return inMemoryFallbackDb;
    }
  })();

  return connectionPromise;
}

export async function getMongoStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  isFallback: boolean;
  dbName: string;
  error?: string;
}> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME ?? "aj_industry";
  if (!uri) {
    return {
      configured: false,
      connected: false,
      isFallback: true,
      dbName,
    };
  }

  try {
    const db = await getMongoDb();
    const isFallback = db === inMemoryFallbackDb;
    return {
      configured: true,
      connected: !isFallback,
      isFallback,
      dbName,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      isFallback: true,
      dbName,
      error: err?.message,
    };
  }
}

export function resetMongoConnection() {
  if (client) {
    try {
      client.close();
    } catch {}
  }
  client = undefined;
  database = undefined;
  connectionPromise = undefined;
}
