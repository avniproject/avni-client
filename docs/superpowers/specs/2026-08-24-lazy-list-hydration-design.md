# Lazy list hydration in EntityHydrator

**Card:** avniproject/avni-client#2061
**Related:** #2019 (SQLite read-perf spike — step 4, lazy-hydration proxy)
**Date:** 2026-08-24

## Problem

On the Realm backend a list property is a live list: it resolves when touched, at any
depth. On SQLite, `EntityHydrator.hydrate()` materialises a plain JS object up front and
bounds the walk with a `depth` budget. When the budget runs out, or when the caller passed
`skipLists`, the list property is set to `[]` (`EntityHydrator.js:216`).

`[]` is a valid value. It is indistinguishable from "this parent genuinely has no
children", so no caller can detect that the data was never loaded.

### How it surfaced

A group-attendance form rule reads `params.entity.individual.groupSubjects` to build the
allowlist of members to show. `depth` decrements on every hop:

```
hydrate("Encounter", row, depth = D)
  └─ :189  individual = resolveReference("Individual", uuid, D - 1)
        └─ hydrate("Individual", row, depth = D - 1)
              └─ :212  groupSubjects loads iff (D - 1) > 0     ⟹ needs D >= 2
```

At `D = 1` the list is `[]`. The rule then produces an empty allowlist, and two
independently reasonable behaviours turn that into the opposite of the intent:

- `FormElement.getApplicableSubjectUUIDs()` (avni-models `FormElement.js:303`) returns
  `null` for an empty `answersToShow` — "no filter configured".
- `SubjectFormElement.getSubjectOptions()` (`SubjectFormElement.js:27-38`) then falls
  through to `getAllBySubjectTypeUUID()`.

So a group of 5 renders every subject of that type in the org, and an attendance record is
saved against the wrong roster. Confirmed on-device: same org, same rule, same data —
Realm shows 5, SQLite shows all.

### Scope

The defect is not specific to `groupSubjects`. Every referenced list property on every
entity — `enrolments`, `encounters`, `relationships`, `comments`, `approvalStatuses` —
reports `[]` when it arrives below the budget. #2061 is the instance where the downstream
code happens to fail *open* and a human noticed.

Two known routes reach it:

1. **Out of budget** — any path hydrating an Encounter at `depth <= 1`.
2. **Explicit opt-out** — `IndividualService.search()` (`IndividualService.js:277`) passes
   `{skipLists: true, depth: 1, listsToInclude: ['enrolments']}`. `groupSubjects` is not
   in `listsToInclude`, so a search-sourced Individual reports `[]` at any depth.

## Approach

Replace the `[]` fallback with a memoised lazy accessor that resolves the list on first
access. `depth` and `skipLists` then degrade from correctness boundaries to prefetch
hints: not fetching up front means paying later, never returning a wrong answer.

### Why this works — the model layer is already an indirection

Model entities are thin wrappers. `new Individual(hydrated)` stores the argument as
`this.that`, and every accessor reads through it at access time
(avni-models `PersistedObject.js:11`):

```js
toEntityList(property, listItemClass) {
    const realmList = this.that[property];   // read on access, not construction
    ...
}
```

Nothing copies or snapshots the hydrated object at construction. Under Realm, `that` is a
Realm proxy and the laziness came from Realm. Under SQLite, `that` is our hydrated object —
so defining the property as an accessor is transparent to the entire model layer.

### Design

Three-way branch replacing the two-way at `EntityHydrator.js:212-216`:

```js
} else if (objectType && depth > 0 && (!skipLists || (listsToInclude && listsToInclude.has(propName)))) {
    result[propName] = this.resolveList(schemaName, propName, objectType, row.uuid, depth - 1);
} else if (objectType && !this._shallowMode) {
    this._defineLazyList(result, propName, schemaName, objectType, row.uuid);
} else {
    result[propName] = [];
}
```

`_defineLazyList` defines a memoised accessor that is:

- **enumerable** — so anything walking properties still sees it;
- **writable** — the model's `set groupSubjects(x)` assigns through `this.that`, so a
  setter must be present or the assignment throws in strict mode;
- **session-wrapped** — it opens its own hydration session so the batch cache and
  back-reference cache apply (`beginHydrationSession` is re-entrant, `:673`);
- **resolved at depth 1** — deep enough for children to be usable, shallow enough to bound
  the cost. Children's own lists come back lazy, so nothing runs away.

### The shallow-mode carve-out

`_shallowMode` is set for the duration of a sync (`SyncService.js:859-869`). It must keep
returning `[]`, because `Individual.associateChild()` (avni-models `Individual.js:540`)
runs for every synced child entity and does:

```js
realmIndividual = General.pick(realmIndividual,
    ["uuid", "latestEntityApprovalStatus"],
    ["enrolments", "encounters", "relationships", "groupSubjects", "comments", "groups", "approvalStatuses"]);
```

and `General.pick` (avni-models `General.js:199`) spreads each one:

```js
picked[listAttribute] = [...from.that[listAttribute]];
```

Under lazy hydration that spread fires all seven accessors per synced child entity —
seven queries plus full child hydration, hundreds of thousands of times on a large sync.

This is where our laziness differs from Realm's, and the difference is the whole reason for
the carve-out. Realm is lazy at **two** levels: the list resolves on access, and each
element of the spread is still a proxy. Ours is lazy at **one**: once the accessor fires,
`resolveList` deep-hydrates every child eagerly (`:407`). So at `General.pick` a Realm
proxy stays cheap while ours would not.

**When #2019 step 4 lands element-level lazy objects, this carve-out becomes removable.**
That is the clean end state; the exception exists only because the second layer is missing.

### Non-goals

- The eager path is unchanged, so none of #2019's measured numbers move.
- No default is flipped to lazy. Lazy-by-default is #2019 step 4.
- `General.pick` is not changed. It spreads seven lists to use one, which is wasted work on
  Realm too, but fixing it widens a bug fix into the sync hot path in a second repo.

`_defineLazyList` is nevertheless built as the reusable property-axis primitive, so step 4
flips a default over it rather than reimplementing it.

## Testing

Unit tests against the real hydrator with mocked rows, following `EntityHydratorTest.js`:

1. **#2061 regression** — an Encounter hydrated at `depth 1` yields all 5 members on
   `individual.groupSubjects`. Fails before the change (returns `[]`).
2. **Shallow-mode carve-out** — with `setShallowMode(true)`, the property is `[]` and
   reading it issues no query. This is the guard on sync.
3. **Memoisation** — two reads of the same lazy property issue one query.

Plus the existing `EntityHydratorTest` and `ListPropertyParentFkSweepTest` suites, which
must stay green.

On-device verification before merge: the #2061 org on prerelease, attendance form shows
exactly the 5 Phulwari members; and a sync run to confirm no change in sync timing.

## Follow-ups (not this card)

- `SyncService.js:851-858` states the shallow-hydrated parent "is only used for its uuid".
  It is not — `associateChild` reads all seven lists. Corrected as part of this change,
  since that comment is what made lazy-everywhere look safe.
- `General.pick` spreading seven lists to use one.
- #2019 step 4, after which the shallow-mode carve-out can be deleted.
