<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# The Legal Chronicle

This repository packages The Legal Chronicle as a standalone React app that can also be embedded at the end of an API call inside another application. It accepts JSON feed payloads (the same structure the file uploader expects) via a simple window-based configuration or a runtime loader.

View your app in AI Studio: https://ai.studio/apps/drive/1ySXrP_RdpA2QPSrqq_EWNvLPmw84Yunq

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Embed in another app

Build the app (`npm run build`) and serve the `dist/` assets from your host application. Before loading the bundle, provide configuration or load data at runtime.

### Option A: Configure a feed URL (auto-load)

Set `window.legalChronicleConfig` before the bundle executes:

```html
<script>
  window.legalChronicleConfig = {
    feedUrl: "https://your.api.example.com/legal-feed",
    sourceLabel: "api"
  };
</script>
<script type="module" src="/assets/index.js"></script>
```

The app will fetch the JSON from `feedUrl` on load. Ensure the API supports CORS for the host domain.

### Option B: Inject feed data directly (auto-load)

```html
<script>
  window.legalChronicleConfig = {
    feedData: {
      feedId: "sample",
      fetchedAt: "2026-02-01T00:00:00Z",
      limitDate: "2026-02-01",
      totalItems: 1,
      items: [
        {
          id: "1",
          url: "https://example.com/story",
          title: "Sample headline",
          publication: "Example Times",
          byline: null,
          authors: [{ name: "Staff", profileUrl: null }],
          publishedAt: "2026-02-01T00:00:00Z",
          updatedAt: "2026-02-01T00:00:00Z",
          summary: "Summary text.",
          bodyHtml: null,
          image: null,
          primaryCategory: null,
          categories: [],
          region: null,
          wordcount: 0,
          readtime: 0
        }
      ]
    },
    sourceLabel: "embedded"
  };
</script>
```

### Option C: Push data at runtime

After the bundle is loaded, call:

```js
window.legalChronicle?.loadFeed(payload, "api");
```

`payload` can be a single feed object or an array of feed objects. The UI will show the same loading sequence used for file uploads.
