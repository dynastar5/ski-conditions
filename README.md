# ski-conditions
Keystone and Breck Dashboard

Live at https://dynastar5.github.io/ski-conditions/

## What's in here

- `index.html`: the dashboard, published by GitHub Pages from `main`.
- `cloudflare-worker.js`: the Cloudflare Worker (`windy-proxy`) the dashboard uses to fetch data that browsers can't load directly (SNOTEL fallback, Liftie lift status, Windy).
- `wrangler.toml`: Cloudflare's config for deploying that Worker from this repo.

## Deploying the Worker

`.github/workflows/deploy-worker.yml` deploys the Worker with GitHub Actions whenever `cloudflare-worker.js`, `wrangler.toml` or the workflow changes on `main`. You can also run it by hand from the **Actions** tab (**Deploy Worker → Run workflow**).

It needs two repository secrets, under **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN`: create it in Cloudflare under **windy-proxy → Settings → Builds → API token for external CI/CD → Create token**.
- `CLOUDFLARE_ACCOUNT_ID`: the long ID in your Cloudflare dashboard URL (`dash.cloudflare.com/<ID>/...`).
