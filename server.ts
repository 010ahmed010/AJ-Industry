import path from "node:path";
import fs from "node:fs";
import express from "express";
import apiApp from "./artifacts/api-server/src/app";

const currentDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : process.cwd();
const PORT = 3000;
const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  const app = express();

  // Mount backend API server
  app.use(apiApp);

  const clientDir = path.resolve(currentDir, "artifacts/aj-industry");

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0" },
      appType: "spa",
      root: clientDir,
    });
    app.use(vite.middlewares);
  } else {
    const cwdDistPath = path.resolve(process.cwd(), "artifacts/aj-industry/dist/public");
    const localDistPath = path.resolve(currentDir, "artifacts/aj-industry/dist/public");
    const distPath = fs.existsSync(cwdDistPath) ? cwdDistPath : localDistPath;

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
