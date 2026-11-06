# ski-conditions
Keystone and Breck Dashboard

Live at https://dynastar5.github.io/ski-conditions/

## What's in here

- `index.html`: the dashboard, published by GitHub Pages from `main`.
- `cloudflare-worker.js`: the Cloudflare Worker (`windy-proxy`) the dashboard uses to fetch data that browsers can't load directly (SNOTEL fallback, Liftie lift status, Windy).
- `wrangler.toml`: Cloudflare's config for deploying that Worker from this repo.

## Deploying the Worker

The Worker deploys through Cloudflare's GitHub integration (Workers Builds). One-time setup in the Cloudflare dashboard:

1. Workers & Pages → **windy-proxy** → **Settings** → **Build**.
2. Connect the GitHub repo `dynastar5/ski-conditions`, branch `main`.
3. Leave the root directory as `/`, the build command empty, and the deploy command as `npx wrangler deploy`.

After that, every push to `main` redeploys the Worker automatically.
