# CollectionAtlas: development plan

Estimated future effort: **68–102 hours**. These milestones are proposed, not implemented or approved paid work. Reassess scope after practical use.

## 1. Hierarchical organization and views — 14–22 hours

Add nested collections, breadcrumbs, table/card modes and saved filters. Preserve stable IDs and selection when changing presentation or tree order.

Definition of done: documented behavior, regression tests, matched before/after UI evidence where visible, valid import/export, and preservation of current undo and storage behavior.

## 2. Import and attachment workflow — 16–24 hours

Add validated CSV import previews, duplicate resolution and original local image attachments. Support cancellation and reject partial imports without losing the existing collection.

Definition of done: documented behavior, regression tests, matched before/after UI evidence where visible, valid import/export, and preservation of current undo and storage behavior.

## 3. Search and scale — 14–20 hours

Add background indexing, sorting and virtualization with explicit loading/error states. Prevent delayed search results from replacing newer queries.

Definition of done: documented behavior, regression tests, matched before/after UI evidence where visible, valid import/export, and preservation of current undo and storage behavior.

## 4. Bulk editing and recovery — 12–18 hours

Add multi-field changes, reversible deletion and a clear hidden-selection policy. Preserve selection across page size changes and restore both data and selection on undo.

Definition of done: documented behavior, regression tests, matched before/after UI evidence where visible, valid import/export, and preservation of current undo and storage behavior.

## 5. Accessibility and reliability — 12–18 hours

Add complete keyboard navigation, meaningful focus after filtered deletion, conflict review and cross-browser/narrow-screen tests.

Definition of done: documented behavior, regression tests, matched before/after UI evidence where visible, valid import/export, and preservation of current undo and storage behavior.

## Suggested first session

Add a table view and saved filter sets while preserving selection by ID across sorting, pagination and bulk edits.

## Delivery order

Freeze the user-visible requirement and a passing control before implementation. Finish one bounded feature at a time; do not combine all milestones into one evaluation prompt. Record implemented behavior and remaining limitations in the README after each release.
