# Markdown Link Checker

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/sohje/md-link-checker)
![License](https://img.shields.io/github/license/sohje/md-link-checker)


Fast, lightweight (with zero dependencies) GitHub Action for checking the validity of links within your Markdown files.

Written in pure Node 20, it uses native `fetch` and compiles into a single file without needing to download Docker images or gigabytes of dependencies. It supports checking both external HTTP(S) links and local paths to other files within the repository.

## Features
- **Speed:** Checks links in parallel with a connection limit (to avoid overwhelming the network or triggering timeouts).
- **In-Memory Caching:** The same link is checked exactly once, even if it appears in hundreds of files.
- **Local Link Support:** Checks the existence of files pointed to by relative links.
- **No Docker:** Compiles into a single `index.js` via `ncc`, making download and startup lightning fast.
- **GitHub Annotations:** Automatically highlights broken links directly in the pull request, indicating the exact line number and reason (HTTP Status Code or local error).


## Usage

Create a file `.github/workflows/link-checker.yml` in your repository:

```yaml
name: Check Markdown Links

on:
  push:
    branches: [ "main" ]
  pull_request:

jobs:
  check-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Markdown Link Checker
        uses: sohje/md-link-checker@v1.0.0
        with:
          path: './docs' # Directory to check
          exclude-urls: 'localhost,127\.0\.0\.1,.*internal-domain\.com.*'
          parallel: '10'
```

## Inputs Configuration

| Parameter      | Default | Description                                                                                             |
| ------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `path`        | `.`          | Directory (relative to the repository root) for recursive search of `.md` files.                    |
| `exclude-urls`| `""`         | List (comma-separated) of regular expressions for excluding URLs from the check.                         |
| `parallel`    | `5`          | Limit of concurrently checked links. The larger the number, the faster the check, but the higher the chance of 429 Too Many Requests. |

## Development

If you want to modify this action locally:

```bash
npm install
npm run build
```

The script uses `@vercel/ncc` to package all TypeScript code (and its single dependency `@actions/core`) into `dist/index.js`, which is executed by GitHub Actions.
