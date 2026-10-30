// Cloudflare Worker: CORS proxy for the weather and ski dashboards
//  - POST /            → forwards to the Windy Point Forecast API (unchanged behavior)
//  - GET  /?url=<url>  → fetches an allowlisted URL (NRCS SNOTEL) and adds CORS headers

const WINDY_URL = "https://api.windy.com/api/point-forecast/v2";
const ALLOWED_HOSTS = ["wcc.sc.egov.usda.gov"]; // only these hosts can be proxied via ?url=

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    try {
      // GET ?url=… → allowlisted passthrough (SNOTEL CSV)
      if (request.method === "GET") {
        const target = new URL(request.url).searchParams.get("url");
        if (!target) return json({ error: "Missing ?url=" }, 400);
        let host;
        try { host = new URL(target).hostname; } catch { return json({ error: "Bad url" }, 400); }
        if (!ALLOWED_HOSTS.includes(host)) return json({ error: "Host not allowed" }, 403);

        const resp = await fetch(target, { cf: { cacheTtl: 900 } }); // cache 15 min at the edge
        return new Response(await resp.text(), {
          status: resp.status,
          headers: { "Content-Type": resp.headers.get("Content-Type") || "text/plain", ...CORS },
        });
      }

      // POST → Windy
      if (request.method === "POST") {
        const resp = await fetch(WINDY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: await request.text(),
        });
        return new Response(await resp.text(), {
          status: resp.status,
          headers: { "Content-Type": "application/json", ...CORS },
        });
      }

      return json({ error: "Method not allowed" }, 405);
    } catch (err) {
      return json({ error: err.message }, 502);
    }
  },
};
