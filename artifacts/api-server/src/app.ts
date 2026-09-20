import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Error handler for MongoDB or network errors to fail gracefully
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (
    err?.name === "MongooseError" ||
    err?.name === "MongoNetworkError" ||
    err?.name === "MongoServerSelectionError" ||
    err?.message?.includes("buffering timed out") ||
    err?.message?.includes("connect ECONNREFUSED")
  ) {
    console.warn("[AI Studio] Database offline — returning fallback response");
    if (req.method === "GET") {
      res.json(req.path.endsWith("s") || req.path.endsWith("s/") ? [] : {});
      return;
    }
    res.status(503).json({ error: "Service temporarily unavailable (database offline)" });
    return;
  }
  next(err);
});

export default app;

