/* Public CORS proxy for OpenCode Go, deployed on Cloudflare Workers.
 * The upstream only serves command-line agents: it sends no CORS headers and
 * expects a session id (x-opencode-session) plus an identifying user agent.
 * This worker adds exactly that and forwards everything else untouched.
 * It stores nothing; without a valid Go key the upstream rejects the request. */

const UPSTREAM = "https://opencode.ai/zen/go";
const SESSION = "3e8d7617-38ba-4fc3-942c-b2c6d3a7a61e";

const corsHeaders = (req) => {
  const h = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Max-Age": "86400",
  };
  const asked = req.headers.get("access-control-request-headers");
  if (asked) h["Access-Control-Allow-Headers"] = asked;
  return h;
};

export default {
  async fetch(req) {
    const cors = corsHeaders(req);
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(req.url);
    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.delete("origin");
    headers.delete("referer");
    headers.delete("access-control-request-headers");
    headers.set("accept-encoding", "identity");
    headers.set("x-opencode-session", SESSION);
    headers.set("user-agent", "m3e-canvas-worker/1.0");

    const res = await fetch(UPSTREAM + url.pathname + url.search, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    });

    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
