// Serves dist/ on http://127.0.0.1:4310 with no caching, for the test pages in dist/test/.
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

const DIST = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist"
)
const PORT = Number(process.env.PORT ?? 4310)
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".md": "text/markdown",
  ".ts": "text/plain",
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname)
    const file = path.join(
      DIST,
      url.endsWith("/") ? url + "test/gallery.html" : url
    )
    if (
      !file.startsWith(DIST) ||
      !fs.existsSync(file) ||
      fs.statSync(file).isDirectory()
    ) {
      res.writeHead(404).end("not found")
      return
    }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    })
    fs.createReadStream(file).pipe(res)
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(
      `http://127.0.0.1:${PORT}/test/gallery.html  (also ?v=react18, ?v=canvas, &theme=dark)`
    )
    console.log(
      `http://127.0.0.1:${PORT}/test/compare.html  (react19 vs canvas wrappers)`
    )
  })
