import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer as createViteServer } from "vite";
import apiApp from "./artifacts/api-server/src/app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;
const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  const app = express();

  // Mount backend API server
  app.use(apiApp);

  const clientDir = path.resolve(__dirname, "artifacts/aj-industry");

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0" },
      appType: "spa",
      root: clientDir,
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "artifacts/aj-industry/dist/public");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AJ-Industry server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
