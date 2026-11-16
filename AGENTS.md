<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- The heart disease model is trained offline by `scripts/train_heart_model.py` (numpy logistic regression on `scripts/cleveland.data`) and shipped as weights in `src/lib/heart-model.json`; predictions run in the browser via `src/lib/heart-model.ts`. Why: no server or ML runtime needed, and retraining is one script run.
- Saved risk checks: the server recomputes probability/band with `predict()` on save (never trusts client values) and stores raw inputs as JSON so history can be re-described. Why: saved results always match the shipped model.
- AI history summaries run server-side only (`src/lib/history-summary.server.ts`, dynamically imported inside the server function) and return strict JSON validated with zod. Why: keeps the gateway key off the client and the UI renders structured fields, not free text.
