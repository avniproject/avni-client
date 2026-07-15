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
