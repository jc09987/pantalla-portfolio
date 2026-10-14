# Pantalla

Public portfolio demo: a store TV menu that changes when an allowlisted WhatsApp message resolves to a closed command.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What the demo shows

1. **Send WhatsApp** with `agotado mango de leche`. The signature checks, the demo sender is allowlisted, the regex parser returns `set_available`, and mango de leche leaves the board.
2. **Send with a bad signature.** The model is not called. The board stays as it is.
3. **Send an unknown command.** Signature and allowlist pass. The text is outside the command union, so nothing is written.

The full-screen TV is [/v/la-michoacana](http://localhost:3000/v/la-michoacana). The demo board is a separate session so an interview does not write the production menu.

## Command boundary

A model may return only:

`set_available` · `set_price` · `add_item` · `set_photo` · `hide_item` · `help` · `unknown`

Any other key or type is rejected and is not applied. `unknown`, a rejected shape, a model error, or a missing `OPENAI_API_KEY` falls back to the regex parser in `lib/n8n/parse.ts`.

`POST /api/n8n/ingest` still requires `N8N_WEBHOOK_SECRET` and a sender in `store_senders` before that resolver runs.

## Eval

`evals/messages.json` is 32 messy Spanish messages, including a voice-note transcript and a photo with no caption. Each row records pass or fail, the model, latency, and cost.

```bash
# regex fallback only
npm run eval

# model, then regex when the model returns unknown
OPENAI_API_KEY=... npm run eval
```

Results land in `evals/results.json` and on the home page.
