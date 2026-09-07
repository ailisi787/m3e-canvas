/* Local CORS proxy for OpenCode Go.
 * Forwards browser requests to https://opencode.ai/zen/go/v1, adding the CORS
 * headers the upstream does not send (its API only serves command-line tools).
 * Zero dependencies; nothing is stored. Run: node tools/opencode-proxy.mjs */
import http from "node:http";
import { request as httpsRequest } from "node:https";

const PORT = 8787;
const UPSTREAM = "https://opencode.ai/zen/go";

/** CORS answers for every request, echoing the headers the browser asked for */
const corsHeaders = (req) => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": req.headers["access-control-request-headers"] ?? "authorization, content-type",
  "Access-Control-Max-Age": "86400",
});

const server = http.createServer((req, res) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", "http://localhost");
  const target = new URL(UPSTREAM + url.pathname + url.search);
  const headers = { ...req.headers };
  /* hop-by-hop and host headers must not travel to the upstream */
  delete headers.host;
  delete headers.origin;
  delete headers.referer;
  delete headers["access-control-request-headers"];
  headers["accept-encoding"] = "identity";

  const upstream = httpsRequest(
    target,
    { method: req.method, headers },
    (up) => {
      const out = { ...up.headers, ...cors };
      res.writeHead(up.statusCode ?? 502, out);
      up.pipe(res);
    },
  );

  upstream.on("error", (e) => {
    res.writeHead(502, { "content-type": "application/json", ...cors });
    res.end(JSON.stringify({ error: { message: `proxy cannot reach the upstream: ${e.message}` } }));
  });

  req.pipe(upstream);
  req.on("error", () => upstream.destroy());
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`OpenCode proxy ready: http://localhost:${PORT}/v1  ->  ${UPSTREAM}/v1`);
  console.log("Keep this window open while you use the AI features in M3E Canvas.");
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
  process.exit(0);
});
