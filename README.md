# CollectionAtlas

CollectionAtlas is a local catalogue application for fictional craft and design materials. It offers collection and tag filtering, paginated material cards, stable multi-selection, bulk movement and archiving, item editing, undo/redo and portable JSON documents. A Python/SQLite backend validates quantities and references and protects saved documents from stale writes.

This is a new local application prototype with original synthetic examples and no claimed user base. It shares a small original local-workspace foundation with other personal utility projects; its domain model and workflows are specific to this application. No external service, account or telemetry is required.

## Implemented baseline

Material cards with original CSS swatches; collections; searchable tags and types; sorted pagination; selection retained across pages/filters; hidden-selection counts; bulk move/archive; undo/redo; JSON import/export; revisioned SQLite storage.

## Run

Python 3.11+ is required; there are no Python runtime dependencies.

```sh
python3 server.py
# Open http://127.0.0.1:7434
```

Run from the repository root. `--port` changes the port; `--data PATH` chooses the SQLite library (default `.local-data/library.sqlite3`). Use the printed `127.0.0.1` address: Host, Origin and custom-header checks protect local mutations. This server is intended for local use, not internet hosting. Back up your library before experimenting with it.

## Test

```sh
python3 -m unittest discover -s tests -v
# In a separate terminal, run the server with a disposable --data path.
npm ci
npx playwright install chromium
npm run test:ui
```

Browser tests use Node.js 20+ and pinned Playwright. They create synthetic saved documents. Set `BASE_URL` for a custom test server and `UI_SCREENSHOTS` for screenshots outside application source. Chromium requires its normal OS libraries. No hosted CI or other-browser certification is claimed.

## Project structure

- `core.py`: normalization, constraints and domain analysis.
- `server.py`: loopback HTTP boundary and optimistic SQLite revisions.
- `web/`: interface, DOM/SVG rendering, dialogs and edit history.
- `examples/sample.json`: original fictional fixture.
- `tests/`: core regression cases and browser workflows.

## Scope and limits

This is a local material reference catalogue, not customer or personal-record management. It does not track purchases or financial data. There is no arbitrary folder tree, actual file/image ingestion, asynchronous indexing, configurable table view or collection deletion yet. Search is case-insensitive substring matching; bulk actions include selected items hidden by filters and disclose their count.

Documents have at most 150 entries; the library supports 100 documents. Request/import size is bounded to 256 KB. Undo/redo is per-tab memory, not durable history. Export drafts before closing; there is no automatic crash recovery yet. Optimistic revisions reject stale saves, but merging conflicts is future work.

Material notes must be text. Omitted, null, empty-string or whitespace-only notes use “—”. Notes are limited to 1000 characters, including whitespace; other non-text values reject the whole import or save without changing the previous document.

## Planned development

[ROADMAP.md](ROADMAP.md) specifies approximately **68–102 hours** of proposed work with acceptance criteria. [QUALITY-PLAN.md](QUALITY-PLAN.md) describes representative review dimensions and transition cases. Estimates are future engineering effort, not completed hours or promised paid work. [CONTRIBUTING.md](CONTRIBUTING.md) explains contribution conventions.

## License

MIT. See [LICENSE](LICENSE).
