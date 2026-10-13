**Summary:**
Cons of mentioned approach:Option C(emulator in van):
- Users of app cant see old longitudinal data in the EMR-lite webapp - but this can be needed(based on PRD)
- wsscrapy - doesn't help

---
# MHU Stage 3 — Collaborative Offline Capability: Technical Approach

Context: JM Financial Foundation Mobile Health Unit (MHU) programme. Stage 3 of the
proposed engagement enables multiple users (Registration, Nurse, Doctor, Pharmacist)
to work collaboratively on the same patient records inside the MHU with no internet,
syncing to the central Avni instance when connectivity returns.

## How Avni works today (relevant facts)

- Each Android device holds a full local DB and syncs entity-by-entity over REST to
  avni-server. Entities are UUID-keyed with audit timestamps.
- The server URL is a per-device setting (`ServerUrlConfiguration.js` / `SettingsService`),
  so a client can be pointed at any avni-server instance.
- Auth is Keycloak/Cognito; Avni already supports self-hosted Keycloak.
- Media is uploaded via server-issued presigned S3 URLs (`MediaQueueService`).
- avni-server has never acted as a sync *client* of another avni-server — this is the
  one genuinely new capability Stage 3 requires.
- The local persistence backend is migrating from Realm to SQLite (op-sqlite + drizzle)
  in release 18.0 (`realm-to-sqlite` merged into `18.0`, card #1955). This changes only
  on-device storage; the sync protocol is unchanged. Stage 3 options that live at the
  server/sync layer are unaffected; any device-level mechanism must target the SQLite
  backend.

## Option 1 — Local Avni server in the van ("Avni-in-a-box") — RECOMMENDED

Run stock avni-server + Postgres + Keycloak on a small fanless PC (NUC-class) with a
Wi-Fi router inside the MHU. Desk devices run the normal Avni Android app pointed at
the box, syncing over LAN every minute or on demand. Handoff between desks becomes
"finish → sync → next desk syncs" and completes in well under a minute on LAN.

Reused: the entire client, the existing sync protocol, Keycloak on-prem.

New engineering — the **upstream sync agent**: a headless process on the box that
speaks the *existing mobile sync protocol* to central Avni, acting like one large
"user" for the van's catchment. It replays local transactions upward and pulls central
changes down. This reuses a battle-tested, entity-based, UUID-keyed contract instead
of inventing server-to-server replication.

Conflict story: one van ≈ one catchment, so concurrent van/HQ edits to the same
record are rare by workflow design. UUID entities + last-write-wins on audit
timestamps covers residual cases. Van clocks must be disciplined (NTP-on-connect or
GPS time) for this to be sound.

Also needed:
- Local media spool (MinIO or disk queue), forwarded to S3 on connectivity.
- Dockerised packaging for the box; remote management when online (Tailscale/balena).
- Automated local backups; restore-from-backup procedure.
- Provisioning of van users/catchments on the box without internet.

## Option 2 — Local server with browser clients (thin-client van)

Same box, but desks use avni-webapp's data entry app in a browser over van Wi-Fi.
All desks share one Postgres, so in-van consistency is free; the upstream sync agent
is the only new engineering.

Trade-offs: webapp DEA is desktop-flavoured, and devices are useless away from van
Wi-Fi (no home visits/outreach). Best used as a **hybrid** with Option 1:
doctor/pharmacist desks on laptops via webapp, outreach staff on the mobile app.

## Option 3 — Device-to-device handoff (no server in the van)

- **QR handoff**: registration generates a QR with patient UUID + registration
  payload; the next desk scans and imports into its local DB; every device syncs to
  central independently later. No infrastructure, but only the handoff slice travels
  (QR capacity limits payload) — no shared longitudinal record. Legitimate low-cost
  fallback and de-risking demo.
- **P2P sync** (hotspot / Wi-Fi Direct / Google Nearby): true device-to-device sync
  inside the client, no server hardware at all. Explored in depth in
  "P2P + SQLite deep dive" below.

## Ruled out

- **Realm/Atlas Device Sync** — deprecated by MongoDB (EOL Sept 2025); Avni is
  leaving Realm in 18.0 anyway.
- **CRDT platforms** (PowerSync, ElectricSQL, Ditto) — solve this problem but require
  replacing Avni's persistence/sync layer wholesale; a platform rewrite, not a
  feature. Exception: **cr-sqlite** is an extension loadable into op-sqlite (the
  engine 18.0 already adopts), not a platform swap — see the P2P deep dive below.
- **Bidirectional Postgres logical replication** — fragile conflict handling, couples
  schema migrations across instances; dominated by the sync-agent approach.

## Recommendation

Option 1 with the headless sync agent as the core new component, optionally hybridised
with Option 2 for desk roles. It changes nothing about the field app, reuses the proven
sync protocol on both hops (device↔box, box↔central), keeps devices useful away from
the van, and the sync agent becomes a reusable Avni capability for any "sub-server"
deployment (camps, remote clinics) — matching the goal of a reusable MHU capability.

## Stage 3 validation plan (ordered by risk)

1. **Sync agent prototype**: box replays a day's transactions to central and pulls
   central edits to van-owned records back down.
2. **Conflict semantics**: same patient edited in van and centrally between syncs —
   define and verify the resolution rule.
3. **User/catchment provisioning** on the box with no internet (Keycloak offline,
   onboarding new field staff).
4. **Media spool-and-forward** end to end.
5. **Ops drill**: box upgrade, box death + restore-from-backup, clock drift handling.

## Open questions

- Sizing: patients/day per van, number of vans, catchment overlap between vans.
- Does central-to-van flow need anything beyond reference data + the van's own
  catchment (e.g., records registered at HQ for a van's area)?
- Hardware constraints in the van: power budget, temperature, physical security.
- Support model: who fixes a dead box in the field, and what is the paper fallback?
--------------------
ws-scrcpy is screen mirroring + remote control of an Android device in a browser over WebSockets — it moves pixels and touches, not
data. So it doesn't solve the core Stage 3 problem (a shared patient database across desks), but it's genuinely useful in a few
specific places, and one creative variant is worth knowing about.

Where it does not help: collaborative work. It gives you many viewers of one screen but only one session. Registration processing
patient B while the doctor consults patient A on the same device is impossible — the desks would be fighting over one cursor. All
actions also happen as the single logged-in user, so role separation and the audit trail vanish. And note the maintenance flag:
NetrisTV archived ws-scrcpy (it's unmaintained; the underlying Genymobile scrcpy is alive, and forks exist), so it's demo/tooling
material, not something to build a deployment on.
----------------
# P2P + SQLite Deep Dive (Wi-Fi Direct / hotspot, no extra hardware)

Motivation: scales at field level with zero additional setup — no box, no router, no
van dependency. Works for camps, door-to-door pairs, any ad-hoc team, not just MHUs.
Becomes feasible specifically because 18.0 moves to op-sqlite + drizzle
(`SqliteRepository`/`SqliteProxy`, SQLCipher enabled).

## Topology: star with an anchor device, not a mesh

The MHU has a natural anchor — the registration desk tablet, plugged into van power.
Recommend hub-and-spoke: spokes sync with the hub; the hub holds the merged clinic
picture. A full mesh (every device gossips with every device) multiplies conflict
windows, battery drain, and debugging surface for no workflow benefit. (Exception:
the cr-sqlite design below makes mesh cheap if ever wanted.)

## Transport candidates (ordered by recommendation)

**T1 — Hub hotspot + embedded HTTP server (recommended for the spike).**
Hub raises a hotspot (LocalOnlyHotspot API, or manual hotspot); spokes join —
programmatically via `WifiNetworkSpecifier` on Android 10+, manually below (minSdk
is 24). Spokes reach the hub at the gateway IP on a fixed port; the app embeds a
small HTTP server (Kotlin native module: NanoHTTPD/Ktor). Dumbest possible tech:
inspectable with curl, no pairing dance, no flaky P2P framework.

**T2 — Google Nearby Connections (best UX, more native work).**
Handles discovery, pairing, and transport (BT/BLE/Wi-Fi hotspot under the hood),
`P2P_STAR` strategy fits hub-spoke. Google-maintained, works fully offline, devices
have Play Services. Existing RN wrappers are stale — needs a thin custom Kotlin
module.

**T3 — Raw Wi-Fi Direct (`WifiP2pManager`).**
Group-owner negotiation and OEM quirks make this the most fragile path; RN libraries
(react-native-wifi-p2p) are poorly maintained. Only if T1/T2 fail.

## Sync engine: two designs

### Design A — Avni-protocol-over-LAN (bespoke changelog)

The hub acts as a mini sync server speaking Avni-style entity sync over the local
socket. Reuses the client's existing per-entity dirty tracking:

- Spokes push locally-authored dirty entities to the hub; pull "changed since
  watermark" from it — same semantics as device↔server sync today.
- Incoming entities are written through `SqliteRepository` (same path as server
  sync) so derived data and rules behave identically.
- Each entity carries an origin flag: authored-here vs replica.
- Conflict rule: entity-level last-write-wins on audit timestamp. Real protection
  comes from workflow partitioning — each role authors its own form/encounter
  types, so same-row concurrent edits are rare by design.

**Upstream to central:** any device that gets internet pushes *everything it knows*
(own + replicas); avni-server upserts by UUID so duplicate pushes from multiple
devices should be idempotent — this needs verification (spike 4). Benefit: one
device catching a signal drains the whole clinic's data. Fallback if idempotency
fails: only the author pushes its own entities.

### Design B — cr-sqlite CRDTs

op-sqlite supports bundling **cr-sqlite** via its package.json config block (18.0
already uses that block for `"sqlcipher": true`). Opt transactional tables into
conflict-free replicated relations (`crsql_as_crr`); sync between any two peers
becomes "exchange rows from the `crsql_changes` virtual table since your last seen
version." What this buys:

- Delta capture and merge for free — no bespoke changelog or watermark code.
- Column-level last-write-wins using logical clocks — no dependence on device
  wall-clock discipline (a real weakness of Design A).
- Mesh-capable: any pair of devices can sync directly; the hub is a convenience,
  not a requirement.

Constraints to validate: tables need primary keys and lose some constraints (unique
indexes beyond the pk, FK enforcement); compatibility of the crsqlite flag alongside
sqlcipher; drizzle migration interplay; and project maturity — vlcn.io/cr-sqlite is
in maintenance mode, so pin a version and be prepared to own a fork. Central sync is
unchanged: CRRs are ordinary tables to the existing sync code.

### Design A vs Design B

Design A reuses Avni's sync *semantics* and most of the spoke-side client code — but
not the whole pipeline. Precisely:

**Carries over in Design A:**
- The contract: entity-based, UUID-keyed, push-dirty / pull-since-watermark — same
  mental model the app already uses with avni-server.
- The spoke half: `EntityQueueService` (dirty tracking), `EntitySyncStatusService`
  (watermarks), `SyncService` orchestration — largely re-pointed at a second endpoint.
- The persistence path: peer entities written through the same repository layer as
  server sync, so rules/derived data behave identically.

**Must be built new in Design A:**
1. **The server half, in-app**: the client has never *served* sync; the hub needs an
   embedded HTTP server (small Kotlin module) implementing the push/pull endpoints
   against its SQLite DB (~5% of avni-server, reimplemented).
2. **A second, non-destructive change log**: the entity queue is drained on push to
   central and is owed to avni-server — P2P must not consume it. Needs its own
   per-peer "already sent" tracking plus an authored-here/replica origin flag.
3. **Hub sequence numbers for watermark correctness**: central sync's
   "modified since X" is safe because one server assigns all timestamps. In P2P,
   timestamps come from many device clocks — a slow clock puts an entity below a
   peer's watermark and it is silently skipped forever. Fix: hub stamps ingested
   entities with a local monotonic sequence; spokes pull by sequence. Buildable, but
   this is a hand-rolled version vector — exactly what cr-sqlite provides formally.

| | Design A (Avni protocol over LAN) | Design B (cr-sqlite) |
|---|---|---|
| Change capture | Build (parallel change log) | Free (`crsql_changes`) |
| Watermarks/versions | Build (hub sequence numbers) | Free (logical clocks) |
| Merge granularity | Entity-level LWW — concurrent edits to different fields of one encounter lose one side | Column-level LWW — both survive |
| Clock skew sensitivity | Mitigated by hub sequencing | Immune (logical clocks) |
| Topology | Hub required | Any-to-any; hub optional |
| New native code | HTTP server module only | crsqlite build flag (+ transport) |
| Exotic dependencies | None | cr-sqlite (maintenance mode — pin/fork) |
| Schema constraints | None | PKs required; unique indexes and FK enforcement lost on CRR tables |
| Team familiarity | High — same semantics as today | New model to learn |

Prior going into the spikes: if spike 3 (crsqlite + sqlcipher + drizzle) passes
cleanly, Design B wins on total engineering; if not, Design A is a sound,
more labor-intensive fallback with no exotic dependencies.

## Cross-cutting concerns (both designs)

- **Draft entities must not propagate** — only saved/completed entities enter P2P
  sync.
- **Media**: keep photos/files with the authoring device; peers see a placeholder
  until central sync completes. P2P media transfer only if the PRD demands it
  (e.g., doctor must see registration photo) — it dominates transfer size.
- **Pairing & security**: clinic session key distributed by QR scan at morning
  setup; encrypt the channel (TLS-PSK or libsodium over the socket). At-rest is
  already SQLCipher.
- **Auth**: each user logs into their own device with their own account (normal
  Avni offline login after first online login) — role separation and audit trail
  are preserved, unlike screen-sharing approaches. No Keycloak-in-the-van needed:
  a major simplification vs Option 1.
- **Battery/lifecycle**: hub runs a foreground service (dataSync type — mind
  Android 14+ FGS rules); hub should be the plugged-in device.
- **Fleet heterogeneity** is the biggest practical risk: OEM-specific hotspot and
  Wi-Fi behavior. Standardise the device model for MHU deployments.

## Spike plan (each gate is go/no-go)

1. **Transport**: two devices, hotspot + programmatic join + HTTP hello-world.
   Gate: connect reliably in <30s, survive a 4-hour simulated clinic, on the actual
   fleet device model.
2. **Design A delta exchange**: export dirty entities from device 1, import through
   `SqliteRepository` on device 2; verify rules/derived data intact; measure a
   realistic clinic day (~100 patients) end-to-end sync time.
3. **Design B feasibility**: build op-sqlite with crsqlite+sqlcipher; convert 2–3
   tables to CRRs on a scratch schema; check drizzle migrations still apply.
   Outcome decides A vs B.
4. **Central idempotency**: two devices push overlapping UUIDs to a test
   avni-server; verify no duplicates/corruption.
5. **Field pilot**: one MHU, one clinic day, paper fallback ready.

## P2P vs Option 1 (Avni-in-a-box)

| | P2P (this section) | Local server box |
|---|---|---|
| Extra hardware | None | Box + router + power |
| Scales to small teams/camps | Yes — per-team, zero cost | No — box per site |
| High-volume clinic (many desks) | Radio/battery limits | Comfortable |
| Single source of truth in van | Hub device (softer) | Postgres (strong) |
| New engineering | Client sync layer + transport | Upstream sync agent + fleet ops |
| Ops burden in field | App-only | Box fleet management |

They compose: the box is "just a bigger hub." If P2P's sync layer is built first
(especially Design B), a box deployment later reuses it. Recommendation update: run
spikes 1–3 before committing Stage 3 to either path — the P2P path, if the spikes
pass, is the better strategic fit for Avni's field-level scalability goals.
-----------
so T1 plus design B seems to be better to first try out right?

⏺ Yes — with one refinement: don't run them as a single combined experiment. They de-risk different things and are independent, so
spike them in parallel:

T1 first for transport is clearly right. It's the dumbest possible stack (hotspot + HTTP, curl-debuggable), it exercises the risk
that actually kills P2P projects — OEM Wi-Fi behavior on your specific fleet device — and nothing you learn is wasted: whichever sync
design wins, and even if you later upgrade to Nearby Connections for better pairing UX, the sync payloads ride unchanged on top.

Design B first for the data layer is also right, but for a different reason: it has the single riskiest binary unknown in the whole
plan — does op-sqlite build and run with crsqlite and sqlcipher enabled together, and do drizzle migrations still apply to CRR
tables? That's a bench test, no van, no second device, maybe 2–3 days. If it passes, B eliminates most of Design A's new engineering.
If it fails, you've spent almost nothing and you fall back to A with full confidence rather than lingering doubt.

The refinement: spike B on a bench DB while T1 runs on devices, and only integrate after both pass. If you wire crsqlite into the
transport spike from day one, a failure is ambiguous — you won't know whether the transport or the CRDT layer is at fault. Keep the
T1 spike's payload trivial (a hello-world JSON echo, then a dummy table exchange), prove each independently, then do the combined
test: two devices, T1 transport, crsql_changes exchange, verify convergence.

One thing to check early in the B spike because it's the likeliest failure point: cr-sqlite's merge writes rows directly through the
virtual table, bypassing the app layer — so anything Avni computes on write (derived fields, rule side-effects) needs to be either
recomputed after merge or confirmed to live entirely in columns that sync. Worth adding to spike 3's checklist.


## T1-lite spike results (2026-07-15, Galaxy F41 hub / Galaxy S24 spoke, staging build)

**PASSED (happy path):** ping/pong and 2MB payload over F41 hotspot, no internet.
Byte count exact (2,097,152) on both sides — NDJSON framing survived multi-MB
transfer. Laptop as third client on same hotspot also connected to hub:7373.

Field-relevant findings (all Samsung):

1. **Hotspot gateway is NOT reliably `.1`** — F41 assigned itself 10.101.177.249.
   The `.1` heuristic fails; discovery must be dynamic (subnet port-scan for spike,
   mDNS/NSD or Nearby for production).
2. **Mobile data breaks app sockets to the hotspot.** With a SIM active, Android
   keeps cellular as the default network (hotspot fails internet validation), so app
   sockets route via cellular and get "host unreachable" — while shell ping works.
   Fix: bind client sockets to the wifi network (`interface: 'wifi'` in
   react-native-tcp-socket; `WifiNetworkSpecifier` in production). Field devices
   always have SIMs — this is mandatory, not optional.
3. **"No internet" Wi-Fi fallback:** Samsung prompts "Keep connection?" on joining
   the hotspot and may silently drop back to mobile data. Operator guidance or
   WifiNetworkSpecifier (app-scoped connection, exempt from fallback) required.
4. **Dev-loop note:** Metro Fast Refresh orphans the native TCP listener (JS
   singleton resets, native socket stays bound) — restart app after edits. Not a
   field concern.

5. **Screen-off endurance: PASSED at 10 minutes** — hub (F41) answered ping after
   10 min with screen off. Longer durations (2h+ clinic session) still worth a pass
   later; a foreground service remains the production hardening.

Fixes applied post-test: `interface: 'wifi'` on client sockets — **validated**:
pong received both fully offline (all SIM data off) and with mobile data ON on the
spoke. T1-lite verdict: **TRANSPORT GATE PASSED**. Remaining for production, not
spike: hub discovery (NSD/zeroconf or UDP beacon — see finding 6), automated
hotspot join (WifiNetworkSpecifier), foreground service for multi-hour endurance.
Next spike: Design B gate — cr-sqlite build (`"crsqlite": true` in the op-sqlite
package.json block, verified available in op-sqlite 11.3.0's gradle).

6. **Subnet port-scan discovery is NOT viable with react-native-tcp-socket** — its
   native module serializes all connects through a 2-thread pool with no connect
   timeout, so parallel probing stalls behind dead-host connects. Discovery needs
   NSD/mDNS (react-native-zeroconf) or a UDP broadcast beacon (react-native-udp);
   manual IP entry is the spike fallback. `interface: 'wifi'` binding works fine
   for individual connections.

## Design B gate results (2026-07-15, Galaxy F41, staging build)

- **Phase 1 (build) PASSED**: `"crsqlite": true` + `"sqlcipher": true` compile
  together (both defines verified on every native compile command);
  libcrsqlite.so packaged; app boots clean on both test devices.
- **Phase 2 (runtime probe) PASSED** on device: two SQLCipher-encrypted DBs,
  `crsql_as_crr` conversion, change capture via `crsql_changes`, and
  bidirectional merge with column-level LWW (A→B insert+update, B→A update wins).
  Probe: `src/framework/p2p/CrSqliteProbe.js`, button in Dev Settings.
- Phase 3 pending: real Avni DDL (individual, encounter) with FK constraints —
  does `crsql_as_crr` accept FK-bearing tables; drizzle ALTER on a CRR
  (crsql_begin_alter/commit_alter).

### Phase 3 results (2026-07-16, Galaxy F41) — PASSED, Design B gate CLOSED

All five gates green on real Avni DDL (individual, encounter) under SQLCipher,
`PRAGMA foreign_keys = ON`:
- G3a/G3b: `crsql_as_crr` on both tables (incl. CRR→CRR reference)
- G3c: cross-DB merge of individual + encounter
- G3d: child-before-parent apply using the `db_version > ?` watermark pattern
  (same query shape the real sync layer will use)
- G3e: `crsql_begin_alter` → ALTER TABLE ADD COLUMN → `crsql_commit_alter`,
  post-migration changes still captured

Findings that shape the implementation:
1. **cr-sqlite refuses tables with *declared* FK clauses** (checks
   `pragma_foreign_key_list`, independent of the foreign_keys PRAGMA). Fix: the
   14 transactional tables keep their `*_uuid` reference columns but drop the
   FOREIGN KEY clauses (one-time table-rebuild migration + SchemaGenerator stops
   emitting REFERENCES for transactional tables). Reference tables keep FKs;
   `PRAGMA foreign_keys = ON` can stay globally. This is Realm-era integrity
   semantics — app-enforced UUID references — which Avni ran on for a decade.
2. **Never DROP+recreate a CRR table**: shadow (__crsql_clock) state survives
   and corrupts the successor ("sql logic error"). Table-rebuild migrations must
   use the crsql alter protocol or clean shadow state explicitly.
3. Merge-order hazards disappear entirely once CRR tables carry no FK clauses —
   no defer_foreign_keys machinery needed.

**Verdict: Design B (cr-sqlite) is the recommended sync engine for the P2P path.**
Remaining implementation work (not gate items): FK-strip migration for the 14
transactional tables; CRR conversion at DB init; sync layer = exchange
`crsql_changes` since per-peer watermark over the T1 transport; voiding-only
deletes; two-device convergence test (phase 4).
- Mechanically, SQLite has no DROP CONSTRAINT, so each table needs the standard rebuild: create the new FK-free table, copy rows,
drop old, rename. This happens as a normal drizzle migration before any CRR conversion, so the shadow-state hazard from finding 2
doesn't apply — the order is: strip FKs (plain tables) → then crsql_as_crr.
- Integrity of those references becomes the app's job — which is not a new burden but a return: Realm had no FK enforcement, ever, so
  every integrity guarantee the app actually relied on for ten years already lives in application logic. The declared FKs only arrived
  with the 18.0 SQLite migration, months ago.

### Alternative kept on file: hand-rolled CRR ("Design B-minus") — keeps FK constraints

cr-sqlite's FK refusal is that library's policy, not a law of CRDTs. If we
hand-roll the machinery (triggers appending per-column changes to our own log
table + JS apply with column-LWW on logical clocks), we control the merge path
and can wrap each merge in `PRAGMA defer_foreign_keys = ON` — declared FK
constraints stay, ordering hazards resolve at COMMIT. The irreducible
delete-vs-create violation remains, but Avni deletes by voiding (a column
update), so it's near-nonexistent.

| | cr-sqlite (Design B) | Hand-rolled LWW (B-minus) |
|---|---|---|
| FK clauses | strip from 14 transactional tables | keep, with deferred checks |
| Merge correctness | theirs, production-proven | ours to get right forever |
| Engineering | conversion + one migration | ~2–4k lines triggers + JS bookkeeping |
| Prior art | Expo-ecosystem apps | Actual Budget (JS, years in production) |

Decision: FK removal costs Avni little (Realm ran without FK enforcement for a
decade; integrity is app-enforced already) while owning a distributed merge
engine is a permanent correctness burden. B stays recommended; B-minus is the
documented fallback if cr-sqlite fails in phase 4 or production. A sync-time
referential validator on the hub is cheap and worth adding in either design.

### Phase 4 results (2026-07-16) — PASSED. Architecture proven end to end.

Two phones (F41 hub / S24 spoke), no internet: patients registered on either
device converged on both via crsql_changes exchanged over the T1 TCP transport
(both sides at identical counts/changes, 78 changes). Full-set exchange each
sync also demonstrated LWW idempotency. Every Stage 3 architectural risk is now
retired: transport, CRDT engine, encryption, real DDL, device convergence.

### Design direction for central-sync interplay (proposed by Maha, 2026-07-16)

Make the entity queue itself a CRR: pending-upstream bookkeeping then replicates
with the data, and the hub can drain the whole clinic to the server. Refinements:
- **Mark, don't delete**: CRR deletes propagate — a spoke hard-deleting queue rows
  after handoff would wipe the hub's pending queue before it pushes (race). Use a
  `status` column (pending → pushed) set by the pusher after server accept; the
  mark replicates back; compaction removes old pushed rows later.
- **Hub is the default pusher, not the only one**: any device with connectivity
  may push `pending` rows and mark them; concurrent-push window still needs
  avni-server upsert-by-UUID idempotency as backstop (verify on test server).
- **Media excepted**: files live on the authoring device; media queue entries
  can't transfer ownership unless the file transfers P2P too.
- **Privileges**: the pushing user must hold create/edit rights for all entity
  types spokes author.

### Media over P2P (decision, 2026-07-16)

Media bytes never enter cr-sqlite — DB rows carry only references (Avni's existing
model: filename/UUID inside observations JSON), which replicate via CRDT like any
data. Files move on a **separate app-layer channel over the same TCP transport**.

**Default: media syncs to the hub during every P2P sync** (Maha's decision) —
file transfers to the hub and upstream-upload ownership moves with it (media
queue row status: pending-on-spoke → transferred-to-hub → pushed; single-owner
rule prevents duplicate S3 uploads). Peers other than the hub fetch on demand
(`mediaRequest {uuid}` → owner streams file; ~1–8s per photo at measured LAN
throughput).

App-layer control this buys: per-media-type policy (e.g., video excluded),
size caps/compression before transfer, transfer during idle, hub cache
eviction after successful S3 upload, progress UI. Watch items: hub storage
headroom and sync duration on photo-heavy clinic days — measure in the
vertical-slice phase.

### Design A-star: app-layer sync with hub sequencing (third option, 2026-07-16)

Origin: push (spoke→hub) is nearly free — EntityQueueService already tracks what a
spoke authored. The missing primitive is pull: Avni client tables carry **no
modification timestamps** (server assigns audit times in server sync; local rows
are versionless), so a hub cannot answer "what changed since X".

Fix is a sequence, not timestamps (clock skew makes time-watermarks unsafe):
- Hub keeps a ledger `(seq, entity_type, entity_uuid)`; `seq` increments for every
  entity ingested from any spoke or authored on the hub.
- Spokes pull "everything after seq N", remember highest N received.
- Entities apply through the repository layer — rules-adjacent behavior, derived
  state, UI refresh all follow the existing server-sync path for free.
- Conflicts: last-arrival-at-hub wins, whole entity (coarser than cr-sqlite's
  column LWW — though observations-as-JSON makes that gap smaller in practice).

Trade vs Design B (cr-sqlite):
| | A-star | B (cr-sqlite) |
|---|---|---|
| Bookkeeping | build hub ledger (small) | free, proven in gate |
| Apply path | repository layer (app-consistent) | bypasses app layer (own UI refresh) |
| FK-strip migration | not needed | needed |
| Dependency | none | dormant cr-sqlite (pinned) |
| Topology | **star only — hub structurally required** | any-to-any; hub is convenience |
| Hub dies mid-clinic | sync halts (ledger lost → re-seed) | any device can take over |

**Deciding criterion: is the star topology forever?** If a hub device is a
permanent fixture of every deployment, A-star is defensible and simple. If
spoke↔spoke sync (two workers, no van) or multi-hub merge is ever wanted —
the original field-level-scalability motivation — only B serves it.

Status: Design B remains recommended; A-star is now the documented alternative
ahead of B-minus (hand-rolled column-LWW) since it is simpler than both when the
star assumption holds.

#### A-star pull mechanics (how "give me after N" works)

No per-spoke pull queue. One append-only **ledger on the hub** `(seq, entity_type,
entity_uuid, origin_device)`; `seq` increments for every entity the hub ingests or
authors (appended in the same transaction as the entity save, hooked where
EntityQueue is already written). Each spoke stores a single integer: highest seq
received.

- Pull: `{type:'pull', since: N}` → hub returns current state of entities with
  seq > N (in seq order); spoke applies via repositories, stores new N.
- Hub keeps nothing per spoke; new device joins with since=0; lost cursor re-pulls
  idempotently (UUID upserts).
- Compaction: keep only the latest seq per entity uuid — pulls return current
  state once (state sync, not history).
- Echo filter: exclude rows where origin_device = requester (or accept no-op
  re-apply).
- EntityQueue = per-device producer state ("what have I authored"); ledger =
  hub-central consumer log ("what does the clinic know, in what order") — the
  same shape as server sync, with the ledger as the server's audit timeline.
- Note: this hand-designs what cr-sqlite provides internally (seq ≈ db_version,
  pull ≈ `crsql_changes where db_version > ?`, echo filter ≈ site_id filter).

#### B vs A-star: consolidated comparison

| Axis | B: cr-sqlite | A-star: app-layer |
|---|---|---|
| Change tracking | free, proven | build hub ledger + seq |
| Merge granularity | column LWW (≈entity for observations JSON) | entity, last-arrival wins |
| Convergence | CRDT-guaranteed, any order | via hub's single ordering |
| Apply path | bypasses app layer (own UI refresh) | repositories — app-consistent free |
| Topology | any-to-any | star only, hub required |
| Hub dies mid-clinic | any device takes over | ledger lost, re-seed |
| Schema impact | FK-strip + CRR conversion | one ledger table |
| Later migrations | wrap in crsql alter protocol (proven) | plain |
| Later unique constraints | forbidden on CRRs (app-enforce) | allowed |
| Dependency | dormant cr-sqlite, pinned | none |
| Spike status | phases 1–4 proven on devices | transport proven; ledger unproven |
| Field-level (no-van) vision | served | not served |

Decision rests on topology (hub forever?) and apply path (B's integration tax vs
A-star's structural hub dependence).

#### Indexes on CRR tables (cr-sqlite)

- Non-unique indexes: fine, anytime; wrap CRR-touching DDL in
  crsql_begin_alter/commit_alter as practice (proven G3e). Confirm existing
  0002 high-value indexes survive conversion in the vertical slice.
- UNIQUE indexes: forbidden on CRRs permanently (two offline devices can
  jointly violate uniqueness; CRDT merges can't be rejected). Avni has zero
  unique indexes today; future uniqueness rules on transactional tables must be
  app-/server-enforced. FK analysis: see "removing FKs — side effects" above
  (write-time integrity loss on 14 tables is the only real cost; query
  performance unaffected — FKs create no indexes in SQLite).

#### cr-sqlite / op-sqlite coupling and upgrade path

cr-sqlite is a standard SQLite loadable extension (triggers, functions, virtual
tables) — host-agnostic; op-sqlite merely bundles and auto-loads a prebuilt .so.
Consequences:
- DB file stays plain SQLite/SQLCipher (shadow tables are ordinary tables);
  readable anywhere, CRR *writes* need the extension loaded.
- Any host (Node, box, laptop bridge) can speak the same crsql_changes format.
- op-sqlite upgrade: rebuild + re-run probe buttons (phases 2–4 = regression
  suite). If a future op-sqlite drops the crsqlite flag: bundle libcrsqlite.so
  in our jniLibs and load via the public db.loadExtension() API (~a day; also
  decouples our cr-sqlite version from op-sqlite's bundle).
- The real compatibility surface is cr-sqlite version **across peers**: P2P
  handshake must check app version and refuse mismatched sync.
- Action item: pin op-sqlite exactly (currently "^11.3.0") once P2P ships, so
  the bundled cr-sqlite only changes deliberately.

#### Layering: SQLite vs op-sqlite vs cr-sqlite

```
Avni JS code
    │  db.execute(...)
op-sqlite      ← RN binding: C++/JSI glue exposing SQLite to JS; ships no DB logic
    │  embeds and compiles...
SQLite engine  ← the actual database (our build: SQLCipher fork + encryption)
    │  loads at open...
cr-sqlite      ← loadable extension registering crsql_* functions/tables
    │
.db file
```

- op-sqlite bundles its own engine; the Android system SQLite is never used —
  every device runs exactly the engine we compiled. "Upgrading SQLite" only
  happens through an op-sqlite upgrade we choose.
- Engine newer + extension old = safe (SQLite extension ABI is
  stability-guaranteed; compatibility promised through 2050). op-sqlite bumps do
  not require cr-sqlite changes.
- The only floor runs the other way: cr-sqlite needs some minimum engine
  version; upgrades only move forward, so it can't be violated by upgrading.
- cr-sqlite upgrades only for its own bugs/features, never as a side effect.
  Pinned version ships for years; probe buttons (phases 2–4) are the regression
  check after any layer moves.

#### Removing FKs from transactional tables — side effects

Real costs:
1. Write-time integrity checks lost on the 14 tables — a bug writing a dangling
   parent uuid lands silently. Context: Realm had zero DB-level enforcement for
   ten years; FKs have existed only during 18.0 development. Compensating
   control: periodic app-level consistency check + sync-time referential
   validator on the hub.
2. Parent deletes no longer blocked. Avni voids rather than deletes; the one
   mass-delete path (logout wipe) was *broken by* FKs (#1955 fix) — removal
   simplifies it.

Non-issues: query performance unchanged (SQLite FKs create no indexes; 0002
high-value indexes stay); no cascades exist to lose (all ON DELETE no action);
joins/drizzle/app queries untouched (uuid columns remain); reference tables keep
FKs; server-side Postgres constraints unaffected.

Timing: 18.0 has not shipped — landing FK-free transactional DDL within 18.0
means Realm→SQLite migrators arrive directly into the target schema and no field
device ever runs the 14-table rebuild. If P2P lands post-release, the rebuild
migration runs on real data volumes — measure on F41-class hardware.
-----------
Yes — I still recommend cr-sqlite, but the margin has narrowed enough through this discussion that I want to state the recommendation
precisely, with the one condition that would flip it.

Why B still wins for me:

1. It matches the reason this exploration exists. Your day-one motivation was "scalable at field level without additional setup" —
   two health workers syncing phone-to-phone in a village, camps, ad-hoc teams. A-star structurally cannot do that; its hub isn't a
   convenience, it's the system. Choosing A-star quietly redefines the product from "P2P capability for Avni" down to "MHU van feature."
   That might be the right business call — but it should be made consciously, not fall out of an engine preference.
2. The hard part is already proven. B's risky pieces passed on your devices this week. A-star's unproven pieces (ledger, apply
   protocol) are admittedly low-risk — but "low-risk and unbuilt" still loses to "proven and running" when the effort is otherwise
   comparable.
3. Resilience. Hub phone dies mid-clinic: under B any device takes over and nothing is lost; under A-star the ledger dies with it and
   sync halts until re-seeded. In a van in rural Bihar, that difference is not theoretical.
4. Correctness ownership. A-star looks simple today; distributed bookkeeping has a way of growing edge cases (cursor resets, partial
   pulls, hub re-seeds, echo bugs) that end up as exactly the subtle, unreproducible field bugs a small team least wants to own. B's
   equivalent machinery has years of other people's production mileage.

------------------------

#### FK discussion — consolidated summary

**Realm vs SQL constraints**: Realm had relationships (object links) without
constraints — dangling links were impossible at creation (you link an actual
object), but parent deletes silently nulled links; no declared, checkable
integrity. 18.0 added FK constraints on top of the uuid columns; Design B
removes the constraints, keeps the relationships. Net: one notch below
Realm-era safety on creation (a typo'd uuid becomes writable), covered below.

**Retrieval**: FKs contribute nothing to reads — joins execute identically
without them, SQLite's planner ignores them, and SQLite FKs create no indexes
(unlike MySQL). Retrieval speed = indexes (0002 stays; non-unique indexes can
be added to CRRs anytime). Only losses are DDL self-documentation (drizzle
schema JS remains the source of truth) and FK-based introspection tooling
(unused — repositories join explicitly).

**Integrity without FKs — layered design**:
1. **Write-time validation in the repository save path** (the actual FK
   replacement — parent-exists check, indexed lookup, mostly already implicit
   since services load parent objects; make explicit to close bypasses).
2. **Post-sync orphan checker** — NOT optional in the P2P world: CRDT merge is
   a second writer that bypasses the repository and tolerates out-of-order
   arrival by design, so replication can assemble persistent orphans (parent
   never arrives) that no device's write-time check ever saw. Orphan queries
   generated from drizzle relations, run after each sync cycle, flag only
   orphans persisting past a completed sync, report via telemetry (~a day;
   doubles as sync-bug monitoring during pilot).
3. Hub-side quarantine of invalid incoming batches — skip until evidence
   demands it.
4. avni-server Postgres constraints — existing free backstop; a dangling
   reference fails at upload and never corrupts the canonical record.

Verdict: layer 1 alone replaces the FK; layers 1+2 are the honest minimum for
the replicated system the FK-removal enables.

## DECISION (2026-07-16, Maha): Design A-star selected

App-layer star sync (hub ledger + seq cursor) is the chosen direction. Rationale:
1. **No maintained alternative to cr-sqlite** — dormant upstream, dead forks,
   only competitor is commercial/cloud-bound; the fallback to B failing is
   building our own engine anyway.
2. **Blast radius**: the FK-strip is a platform-wide schema change — every Avni
   deployment loses write-time FK integrity on 14 tables to serve a capability
   few deployments use. A-star is additive and isolated: one ledger table + one
   service; zero impact on non-P2P deployments.

Accepted trade-offs: star topology is structural (no spoke↔spoke without a hub;
field-level no-van vision deferred); hub-death/ledger re-seed procedure must be
designed; sync bookkeeping correctness is owned in-house (mitigated: the team
designed the ledger mechanics and understands them).

Design B (cr-sqlite) is demoted to validated fallback — gate results (phases
1–4) remain on record; if the ledger design hits trouble, B is proven and
pre-integrated rather than a research question. Revert `"crsqlite": true` in
op-sqlite config before production (spike branch keeps it for the probes).

Vertical slice under A-star: ledger table + save-path hook on hub; pull/push
endpoints on the T1 transport; spoke cursor; apply via repositories (reuse
server-sync apply path); entity queue push→hub with status marks; media channel
as decided (default sync to hub). No schema migration required.

#### Engine option S: SQLite session extension (sqlite3session_*)

Core-SQLite changeset machinery (public domain, maintained forever): sessions
record row-level diffs on a connection; `sqlite3changeset_apply` applies them
with a user conflict handler (OMIT/REPLACE/ABORT per conflict, row-level,
before-image based). Uniquely among engine options it **works with checked
FKs** (FK violations delivered to the handler at end of apply) — would never
have raised the platform-wide FK-strip issue.

Costs: not compiled in op-sqlite (enable via `sqliteFlags`:
-DSQLITE_ENABLE_SESSION -DSQLITE_ENABLE_PREUPDATE_HOOK) and **no JS bindings
exist** — a week of JSI/Kotlin bridge work before first spike. Capture is
connection-scoped and non-persistent (blobs must be persisted at write time —
queue machinery still needed); no versioning/idempotency built in (hub
ledger/cursor still needed); applies raw rows, bypassing repositories (same
integration tax as cr-sqlite).

Placement after the A-star decision: **first-choice engine fallback**, ahead of
cr-sqlite in maintenance/FK terms, behind it in proven-ness (B passed phases
1–4 on device; S is unproven on our stack). Relevant only if entity-level state
sync proves too coarse or mesh topology returns.

#### Prior art: Mapeo and Actyx (reviewed 2026-07-17)

**Mapeo** (Digital Democracy — RN/Android offline field mapping, P2P over shared
Wi-Fi, years in production with Amazon indigenous teams) — the closest cousin;
borrow directly:
- **Sync screen UX**: nearby devices listed by name, per-device Sync button,
  visible progress, "keep screen open", user-initiated on both ends —
  field-proven with no-IT-support users; template for the MHU sync screen.
- **Discovery**: mDNS/DNS-SD in an RN Android app in production — validates our
  NSD plan. Shared Wi-Fi framing: hotspot is one way to make the LAN, not the
  architecture (offline router works too).
- **Pairing**: project-key scoping ≈ our clinic session key via QR.
- **Media tiering**: sync thumbnails always, originals lazily/hub-only —
  adopt for photo-heavy clinic days.
- **Caution**: Mapeo full-exchanges ALL data both ways (it has no server of
  record, so peers are the only source of history) and embeds nodejs-mobile +
  hypercore logs. Not our model.

**Why full-exchange can't work for Avni and A-star avoids it**: every device
already holds the catchment via normal server sync; P2P moves only the offline
gap (spoke's EntityQueue out; ledger-since-cursor in) — KBs/day, never the
corpus. **Ledger retention policy (new design element)**: prune entries older
than N days — a fresh spoke's since=0 pull then covers only recent clinic days;
older data arrives via ordinary server sync. Server = bulk + truth, P2P = the
offline gap.

**Actyx** (industrial local-first platform) — the other design family: every
device appends facts to its own event log, devices gossip logs peer-to-peer
(no leader), state is derived by replaying merged logs ordered by Lamport
clocks. Relevant as: production proof of leaderless local-first; vocabulary for
proposals ("local-first cooperation", partition tolerance); reference if the
no-hub mesh vision returns (then: cr-sqlite table-CRDTs vs Actyx-style event
logs). A-star is deliberately the opposite family — ship state (Avni entities),
hub orders it — because Avni's data model and server-of-record are state-shaped.
One-liner: Mapeo shows how our sync screen should look; Actyx shows a different
sync philosophy; A-star borrows the first and deliberately isn't the second.

#### Database-level sync: complete taxonomy (closing word on alternatives)

| Family | Examples | Verdict |
|---|---|---|
| CRDT extension in SQLite | cr-sqlite | evaluated fully; proven fallback |
| Changeset machinery in SQLite | session extension | evaluated; first engine fallback |
| Hand-rolled triggers + clocks | B-minus (Actual Budget style) | evaluated; documented fallback |
| Client↔cloud engines | PowerSync, ElectricSQL, Turso replicas | wrong hop — need a reachable central service; also duplicate Avni's existing (mature) server sync |
| File/WAL-level replication | Litestream, VFS shims, file copy | **structurally single-writer**: replicates one writer's pages/WAL perfectly, cannot merge two; whole-file copy = LWW on the entire database. Backup/hub-reseed tooling only, never sync |
| Consensus clusters | rqlite, dqlite (Raft) | wrong availability model: needs a reachable quorum to accept writes; devices leaving the van block or get ejected. Offline field work requires availability under partition |
| Switch database | CouchDB/PouchDB (CHT's proven model), Couchbase Lite (has LAN P2P), Ditto, ObjectBox | sync is built-in, the price is a platform rewrite (document store; abandons relational schema, openchs-models, the 18.0 migration) |

Conclusion: for a relational SQLite app merging multi-writer offline edits, the
only database-level mechanisms in existence are the three evaluated. A-star was
chosen from a complete survey, not a partial one.

#### A-star multi-writer semantics (conflict walkthrough)

Multi-writer = several devices editing local copies offline, merged later. Two
levels:
- **Different entities** (≈all clinic traffic): union via hub ledger. Trivial.
- **Same entity edited on two devices between syncs**: entity-level,
  **last-arrival-at-hub wins** — the later-arriving version upserts the whole
  entity; the earlier edit is silently discarded. Accepted because MHU roles
  author their own forms (rare overlap) and observations-as-JSON blunts even
  column-level merging. Loss surface comparison: file copy loses the whole DB;
  A-star loses at most one entity on a true concurrent edit; a CRDT loses at
  most one field.

Correctness rule found by walkthrough (bug fixed 2026-07-17 in
P2PStarSyncService): on pull, dedupe ledger rows to the winning (latest) row per
entity **before** excluding the requester's own rows. Filtering first serves a
peer's older, defeated edit over the requester's newer one → permanent
divergence (requester's cursor passes the winning seq it never received).

## A-star vertical slice — TEST RESULTS (2026-07-17, F41 hub / S24 spoke, staging)

**PASSED both directions on real tables, real forms, real screens, no internet:**
- Registration (Individual + observations) on S24 → A★ sync → visible in F41's
  normal search.
- Program enrolment on F41 → A★ sync → visible on S24.

Integration bugs found and fixed during the run (all "skip + retry", never
corruption — the sync loop is self-healing by design since the spoke queue is
never consumed):
1. Service registration: new services MUST be imported in AllServices.js (Metro
   inlineRequires defers module load past BeanRegistry.init).
2. toResource/fromResource asymmetry #1: flat reference keys vs _links.<key>.href
   (+ server renames, e.g. addressLevelUUID→addressUUID) — adapter wraps/aliases.
3. Asymmetry #2: observations emitted as [{conceptUUID, value}] array but parsed
   as {conceptUUID: value} map — adapter converts any obs-shaped array.
4. Pull correctness: dedupe ledger rows to latest-per-entity BEFORE excluding
   requester's own rows (else a defeated older peer edit overwrites the
   requester's newer one → permanent divergence).

Implementation: src/service/P2PStarSyncService.js (ledger in own sqlite side-DB,
no app schema change; outbox = EntityQueue resources; apply mirrors server-sync
persistAll minus EntitySyncStatus/telemetry; whitelist Individual/Encounter/
ProgramEnrolment/ProgramEncounter), astarPush/astarPull messages on the T1
transport, Dev Settings buttons.

Remaining for production: discovery + sync-screen UX (Mapeo-style), foreground
service on hub, ledger retention, verify remaining whitelist types + Encounter
direction, media channel, hub re-seed, server upsert-idempotency check (gates
the upstream queue design).

#### Cursor scoping (production requirement, from 2026-07-17 review)

The spoke cursor is passive state — touched only during an A★ sync, invisible
to normal server sync, no operator interaction ever (one Sync button, Mapeo
style). But it must be scoped, not global:
- **Per-hub**: store cursor[hubDeviceId] (handshake returns hub id). A global
  cursor from Van 3 (seq 40) against Van 7's younger ledger (seq 10) silently
  skips everything until 41. New hub → cursor starts at 0 automatically.
- **Ledger epoch**: ledger carries a UUID regenerated on creation; pull response
  includes it; mismatch → spoke resets that hub's cursor to 0. Handles hub
  re-seed/replacement; safe because apply is idempotent (UUID upserts).
This also completes the hub-death story: promote any device to hub → fresh
epoch → spokes auto-reset and re-pull; worst case is redundant no-op re-applies.

#### Push watermark (production requirement — the cursor's twin)

Slice behavior (observed in test logs): the spoke re-pushes its entire
EntityQueue every A★ sync, since the queue is only drained by server sync.
Fine at day scale; wasteful over a week-long offline camp.

Fix: `pushedUpTo[hubId]` — one savedAt timestamp per hub in the spoke side-DB.
Outbox = queue items with savedAt >= watermark; advance on hub ack; never touch
the queue itself (server sync still owns popping). Properties:
- Re-saved entity gets a newer savedAt → re-pushed. ✓
- New/replacement hub → no watermark → full re-push (exactly the hub-death
  recovery needed), automatic. ✓
- Lost watermark → redundant idempotent re-pushes; bandwidth, never data — the
  same safety asymmetry as the pull cursor.

Complete per-spoke sync state: two values per hub — cursor[hubId] (pull) and
pushedUpTo[hubId] (push) — both optimizations over a stateless full re-exchange
floor ("cursor = optimization; correctness never depends on bookkeeping").

#### Concurrent spokes syncing (two peers at the same instant)

Normal case is interleaved syncs: hub is a relay with one-sync latency — data
reaches the hub when its author syncs, reaches every other spoke on their next
pull (origin filter passes cross-peer data). Propagation speed = sync frequency
(near-real-time with an auto-sync timer on clinic Wi-Fi).

Truly simultaneous connections are safe by three layers:
- transport: TCP server handles multiple sockets (proven with 3 clients in T1);
- interleaving: JS event loop interleaves handlers only at await points; each
  entity-type batch applies in one atomic native call; **ledger rows are
  appended only after a push's apply completes**, so a concurrent pull can never
  serve a half-applied push;
- ledger: autoincrement seq is safe under concurrent inserts.

Production hardening: add an async mutex on the hub's apply path (serialize
whole pushes; ~5 lines) — turns "safe by reasoning" into "safe by construction";
clinic-scale throughput never notices. Same-entity from two peers remains
last-arrival-wins with the dedupe-before-echo-filter rule.

#### Media over the A-star sync (spoke→hub images)

Transport already proven (T1 2MB blob = photo-sized). Design (per 2026-07-16
media decision, mapped to the implementation):
- Outbox driven by **MediaQueue** (as entities are by EntityQueue), gated by a
  per-hub push watermark (same twin-cursor pattern).
- `mediaPush` message family on the NDJSON socket: header {fileName, size,
  entityUUID} + base64 chunks + end marker (reuses the proven chunking).
  1–5MB photo ≈ 1–8s at measured LAN throughput.
- Hub writes the file into its own media directory (same name): its UI renders
  it for the synced entity, and it inserts into its own MediaQueue —
  **upload-ownership transfer** (pending-on-spoke → transferred-to-hub →
  pushed; single-owner rule prevents duplicate S3 uploads).
- File idempotency: hub skips files it already has (name+size/hash).
- Reverse direction stays lazy: `mediaRequest {uuid}` on demand; Mapeo-style
  thumbnail tiering if volume demands.
- Ordering falls out naturally: entity arrives via astarPush first; until the
  file lands the hub shows Avni's standard media placeholder (existing app
  behavior for undownloaded server media).
- Effort: ≈ a spike-day (handlers ≈ phase-4 size + MediaQueue insert +
  watermark); slots into P2PStarSyncService beside the entity flow.

## FINAL PRODUCTION APPROACH — SUMMARY (as of 2026-07-17)

**Hub and spokes via P2P — every device runs the full avni-client (no bespoke frontend).**

1. A phone/tablet acts as hub: hotspot on → Start Hub → hub advertises itself by
   name (NSD). Hub keeps a ledger `(seq, entity_type, entity_uuid, origin)` of
   every entity received/authored. Hub has a persistent device UUID (identity —
   the key spokes file their cursors under) + a ledger epoch UUID (changes only
   on ledger rebuild).
2. Spoke devices auto-join the hub's network and discover it by name.
3. Spokes do normal data entry in the full Avni app. Entities travel as the
   existing `toResource` JSON and apply through the repository layer — same
   path as server sync.
4. Spokes sync with the hub: push new EntityQueue items (push watermark), pull
   ledger entries after their cursor — both tracked per hub. The EntityQueue is
   NEVER consumed by P2P sync.
5. Conflicts: entity-level, last-arrival-at-hub wins; voiding is the only
   delete. Server sync untouched — P2P carries only the clinic-day delta.
6. **No single point of failure for data delivery**: since spoke queues stay
   intact, every device can still upload its own data to the server directly if
   the hub is lost. The hub is a convenience for in-clinic sharing, not a
   custodian. (Deleting queue entries on hub-sync was considered and rejected —
   it would strand spoke data if the hub dies before its server sync.)
7. Hub lost → any device becomes hub; spokes see a new uuid/epoch on handshake
   and reset cursors (worst case: idempotent re-exchange). Simpler v1 option:
   drop cursors entirely, full re-exchange each sync (idempotent, bounded by
   ledger retention).
8. Media rides the same channel (transport verified with a 2MB byte-exact
   blob): files transfer to the hub with upload-ownership handoff; peers fetch
   lazily; thumbnail tiering if volume demands.

**Status**: vertical slice PASSED on-device 2026-07-17 (registration spoke→hub,
enrolment hub→spoke, real forms/screens, offline; demo videos on card #2002).
**Remaining build list**: NSD discovery + Mapeo-style sync screen; foreground
service; per-hub cursor/watermark/epoch (designed, not yet coded); hub apply
mutex; ledger retention; media channel; remaining whitelist entity types +
per-type adapter verification; consistency checker (layers 1+2); pairing/TLS;
revert crsqlite flag; server idempotency check. Fallback engines in reserve:
cr-sqlite (proven, needs FK-strip), session extension, hand-rolled LWW.

#### Hub/spoke membership fluidity + catchment boundary

The hub is stateless about spokes: new spoke → no cursor for this hub → pulls
from 0 (bounded by ledger retention); departing spoke → nothing to clean up;
mixed teams → each spoke syncs against its own cursor. Same hub with different
spokes over time is the normal case, not an edge case.

Boundary condition: **P2P pull has no catchment filter** (server sync scopes by
user catchment; the ledger serves its window to any paired spoke). Assumption:
one hub = one team = one catchment. If cross-catchment hub sharing is ever
needed, add a ledger-side scope filter — future work, not in v1.
