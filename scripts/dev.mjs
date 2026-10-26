import { build, context } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve, extname } from "node:path";

const root = resolve(".");
const output = resolve(root, "main.js");
const livePlugin = resolve(
  root,
  ".obsidian",
  "plugins",
  "command-center",
  "main.js"
);
const webOutput = resolve(root, "dist", "sandbox.js");

const buildOptions = {
  entryPoints: [resolve(root, "src", "main.ts")],
  bundle: true,
  outfile: output,
  external: ["obsidian"],
  format: "cjs",
  target: "es2020",
};

const webBuildOptions = {
  entryPoints: [resolve(root, "src", "web", "index.ts")],
  bundle: true,
  outfile: webOutput,
  format: "esm",
  platform: "browser",
  target: "es2020",
  sourcemap: true,
};

function syncToObsidian() {
  mkdirSync(dirname(livePlugin), { recursive: true });
  copyFileSync(output, livePlugin);
  console.log(`Synced ${output} → ${livePlugin}`);
}

function startWebServer(port = 3000, host = "127.0.0.1") {
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".map": "application/json; charset=utf-8",
  };

  const server = createServer((req, res) => {
    let urlPath = (req.url || "/").split("?")[0];
    if (urlPath === "/" || urlPath === "") {
      urlPath = "/index.html";
    }

    const filePath = resolve(root, urlPath.startsWith("/") ? urlPath.slice(1) : urlPath);

    if (existsSync(filePath)) {
      const ext = extname(filePath);
      const contentType = mimeTypes[ext] || "text/plain";
      try {
        const content = readFileSync(filePath);
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        });
        res.end(content);
        return;
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`Error reading file: ${err.message}`);
        return;
      }
    }

    // Fallback to index.html for SPA routes
    const indexPath = resolve(root, "index.html");
    if (existsSync(indexPath)) {
      const content = readFileSync(indexPath);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.end(content);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  server.listen(port, host, () => {
    console.log(`Command Center Web Sandbox listening on http://${host}:${port}`);
  });
}

try {
  mkdirSync(resolve(root, "dist"), { recursive: true });

  // 1. Initial build & watch for Obsidian plugin
  await build(buildOptions);
  syncToObsidian();

  const obsidianCtx = await context({
    ...buildOptions,
    plugins: [
      {
        name: "sync-to-obsidian",
        setup(b) {
          b.onEnd((result) => {
            if (result.errors.length === 0) {
              try {
                syncToObsidian();
              } catch (error) {
                console.error("Failed to sync to Obsidian:", error);
              }
            }
          });
        },
      },
    ],
  });
  await obsidianCtx.watch();

  // 2. Initial build & watch for Web Sandbox
  await build(webBuildOptions);
  const webCtx = await context(webBuildOptions);
  await webCtx.watch();

  // 3. Start web server on port 3000
  startWebServer(3000, "127.0.0.1");

  console.log("Command Center development server running.");
} catch (error) {
  console.error("Development build failed:", error);
  process.exit(1);
}