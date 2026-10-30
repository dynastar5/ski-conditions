// Cloudflare Worker: CORS proxy for the weather and ski dashboards
//  - POST /            → forwards to the Windy Point Forecast API (unchanged behavior)
//  - GET  /?url=<url>  → fetches an allowlisted URL (NRCS SNOTEL) and adds CORS headers
//  - GET  /?terrain=key|breck → Keystone/Breck trail, grooming & lift status as JSON

const WINDY_URL = "https://api.windy.com/api/point-forecast/v2";
const ALLOWED_HOSTS = ["wcc.sc.egov.usda.gov"]; // only these hosts can be proxied via ?url=

// Only these two fixed pages can be read via ?terrain=
const TERRAIN_PAGES = {
  key: "https://www.keystoneresort.com/the-mountain/mountain-conditions/terrain-and-lift-status.aspx",
  breck: "https://www.breckenridge.com/the-mountain/mountain-conditions/terrain-and-lift-status.aspx",
};

// The resort page embeds its status data as `FR.TerrainStatusFeed = {...}`.
// Pull out just that JSON object (brace-matched, string-aware).
function extractTerrainFeed(html) {
  const m = html.match(/FR\.TerrainStatusFeed\s*=\s*\{/);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0, inStr = false, esc = false;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(html.slice(start, j + 1));
  }
  return null;
}

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
        const params = new URL(request.url).searchParams;

        // GET ?terrain=key|breck → resort trail/grooming/lift feed
        const resort = params.get("terrain");
        if (resort) {
          const page = TERRAIN_PAGES[resort];
          if (!page) return json({ error: "Unknown resort" }, 400);
          const resp = await fetch(page, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; ski-conditions-dashboard)",
              "Accept": "text/html",
            },
            cf: { cacheTtl: 600, cacheEverything: true }, // cache 10 min at the edge
          });
          if (!resp.ok) return json({ error: `Resort page returned HTTP ${resp.status}` }, 502);
          const feed = extractTerrainFeed(await resp.text());
          if (!feed) return json({ error: "Terrain feed not found on resort page" }, 502);
          return json(feed, 200);
        }

        const target = params.get("url");
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
