# Audit Display 📊✨

![Node version](https://img.shields.io/badge/node-%3E=18.x-green.svg)
![Eleventy version](https://img.shields.io/npm/v/@11ty/eleventy.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

A tiny static site powered by [Eleventy](https://www.11ty.dev/) that fetches audit data from Airtable and displays it with some simple Bootstrap styling. Use it to keep an eye on the health of your websites! 🚀

## Features

- ⚡ Fetches site and audit records directly from Airtable
- 📈 Renders a list of sites with average PageSpeed scores
- 📊 Detailed audit page for each site
- 🔧 Built with Node.js and Eleventy

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure Airtable access**
   - Create a `.env` file with `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID`.
   - Edit `site-config.json` and list the Airtable record IDs you want to include in `includeSites`.
3. **Fetch data and start the dev server**
   ```bash
   npm start
   ```
   This runs `npm run fetch` to pull data from Airtable and then serves the site with live reload.

## Available Scripts

- `npm run fetch` – Fetch Airtable data and write `src/_data/sites.json`
- `npm run build` – Build the static site with Eleventy
- `npm run serve` – Serve the site locally with Eleventy’s dev server
- `npm start` – Fetch and then serve (useful during development)

## Project Structure

```
scripts/              Node scripts (Airtable fetcher)
src/                  Eleventy templates
src/_includes/        Base layout
site-config.json      IDs of sites to include from Airtable
```

## CI/CD Workflow

The workflow at `.github/workflows/ci-cd.yml` builds and deploys the site to
GitHub Pages. It can be triggered manually, on a daily schedule, or via a
`repository_dispatch` webhook. The job installs dependencies, runs `npm run fetch`
and `npm run build`, then uploads the `dist` directory and deploys it with
`actions/deploy-pages@v1`.

## License

This project is licensed under the [MIT License](LICENSE). Enjoy! 🎉
