# Members' Corner

Torghatten Capital's tool platform. Each tool is one page under `public/`:

| Page | Tool |
|---|---|
| `/` | Hub with links to every tool. Old reverse DCF links (`/?t=CSU.TO`) redirect to `/reverse-dcf`. |
| `/reverse-dcf` | Members only. Works backwards from a share price to the free cash flow growth it assumes |
| `/attention` | Members only. Attention score: how much a stock is talked about, 1 to 100 |
| `/diversification` | Members only. Diversification simulator: how much edge concentration needs |
| `/held` | Members only. Would you have held: every big fall in a stock's history, and what selling cost |
| `/moat` | Members only. Moat test (Dorsey, 7 Powers) and 12-question checklist, saved in the browser |
| `/compounding` | Members only. Compounding calculator, the web version of `Compounding.xlsx` |

Shared look and header live in `public/assets/tc.css` and `public/assets/tc.js`.
To add a tool, add `public/<name>/index.html`, load those two files, and add a
link in `TOOLS` in `tc.js` and a card in `public/index.html`.

## Attention score

`api/attention.js` and `lib/attention.js`. Free sources, no keys:

- **Wikipedia** page views (Wikimedia API), average of the last 30 days.
- **Google News** RSS, stories in the last 7 days. The feed caps at 100 items.
- **Reddit** mentions in the last 24 hours, from ApeWisdom. US tickers only.
- **StockTwits** watcher count. US tickers only, and it can block cloud servers.

Each source gets 0 to 100 points on a log scale (`ANCHORS`), and the score is a
weighted average (`WEIGHTS`) of the sources that answered. Sources that fail are
shown as unavailable rather than breaking the score.

# Reverse DCF

Works backwards from a share price to the growth in free cash flow per share
the price already assumes. Readers search for a company, and the app fetches
the price and cash flow history and does the rest.

## What's in here

| Path | What it does |
|---|---|
| `public/reverse-dcf/index.html` | The whole page: layout, model, charts, English and Norwegian text |
| `api/search.js` | Company and ticker search |
| `api/company.js` | Price, cash flow history, share count, and exchange rate for one ticker |
| `api/health.js` | Shows which data sources respond. Open it after you deploy |
| `lib/` | Yahoo Finance client, SEC EDGAR client, and the data assembly |
| `test/` | Checks, mock data, and a local server |

There are no dependencies and no build step.

## Deploy to Vercel

1. Create a GitHub repository and push this folder to it.
2. On vercel.com, select **Add New**, then **Project**, and import the repository.
   Keep the defaults and select **Deploy**.
3. Optional: under **Settings**, then **Environment Variables**, add
   `SEC_USER_AGENT` with a value like `reverse-dcf you@example.com`. The SEC
   asks for a contact address on requests to EDGAR.
4. Open `https://<your-project>.vercel.app/api/health`. Each source should show
   `"ok": true`.

Link to a specific company from a post with `?t=`, for example
`https://<your-project>.vercel.app/reverse-dcf?t=CSU.TO`.

To show a link back to your Substack, set `SUBSTACK_URL` near the top of the
second script in `public/reverse-dcf/index.html`.

## Run it locally

```
npm test              # model and data checks
npm run dev           # live data, http://localhost:3000
MOCK=1 npm run dev    # mock data, no network needed
```

## Data sources and their limits

- **Yahoo Finance** (unofficial web endpoints, no key): search, prices, about
  four fiscal years of cash flow, and trailing twelve months. Covers most
  exchanges, including Toronto and Oslo. Yahoo doesn't document or guarantee
  these endpoints, and it can rate-limit cloud servers. Responses are cached
  for an hour at the edge to keep request volume low.
- **SEC EDGAR** (official, free): extends history to ten years or more for
  companies that file a 10-K. Not available for foreign listings.

If a source fails, the page says so and readers can still enter their own
numbers or open the built-in Constellation Software example.

To switch to a paid provider later, replace the three functions in
`lib/yahoo.js` (`search`, `chart`, `fundamentals`). Nothing else changes.

## The model

Value today = dividends received over N years + the price in year N, both
discounted at the required return. The price in year N is free cash flow per
share in that year times the exit multiple. The app sets value equal to today's
price and solves for growth. Buybacks aren't a cash flow in the model, because
they already show up as growth per share.

Free cash flow is cash from operations minus capital expenditure. Acquisition
spending isn't deducted.

## Member access

Set these in Vercel (Production and Preview), then redeploy:

| Variable | What it is |
|---|---|
| `ACCESS_SECRET` | Long random string. Signs every code and session. Change it to cut all access. |
| `ADMIN_EMAIL` | Your email. Only this address can open `/admin`. |
| `ADMIN_KEY` | Your admin password. Sign in at `/admin` with `ADMIN_EMAIL` and this. |
| `REVOKED_EMAILS` | Optional. Comma-separated emails that lose access. |

## Academy editor

The course content lives in `public/academy/content/*.json`. Sign in as admin and open any Academy page; the **Edit** button opens `/academy/edit`, where you change lessons, exercises, the assignment and the test, and click **Save and publish**.

Saving commits the JSON file to GitHub, and Vercel redeploys in a minute or two. It needs one environment variable in Vercel:

- `GITHUB_TOKEN`: a fine-grained personal access token with **Contents: Read and write** on `arneulland/reverse-dcf` only.
- Optional: `GITHUB_REPO` (default `arneulland/reverse-dcf`) and `GITHUB_BRANCH` (default `main`).

Locally, run the dev server with `ACADEMY_LOCAL_WRITE=1` to save to disk instead.
