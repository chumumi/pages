# Link settings

Edit `links.json` to add destinations without touching the page layout.

## Accounts

Set each value to a full URL.

```json
{
  "accounts": {
    "github": "https://github.com/your-name",
    "twitter": "https://x.com/your-name",
    "youtube": "https://www.youtube.com/@your-name",
    "discord": "https://discord.gg/your-code"
  }
}
```

## Services

Add a new item to `services` when a new service is ready.

```json
{
  "id": "new-service",
  "name": "New Service",
  "status": "Coming soon",
  "description": "Short description shown on the top page.",
  "url": "https://example.com",
  "linkLabel": "Open"
}
```
