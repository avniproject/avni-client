-- Useful server-side (Postgres) queries for the Realm → SQLite migration rollout.
-- Run against the avni-server DB (Metabase / psql).

-- Sync activity per user in the last 3 months — who is actually in the field.
SELECT u.username,
       u.id,
       u.name,
       max(st.sync_start_time) AS last_sync_time,
       count(*)                AS sync_count
FROM sync_telemetry st
         JOIN users u ON u.id = st.user_id
WHERE st.sync_start_time >= now() - interval '3 months'
  and u.organisation_id = 347
GROUP BY u.username, u.name, u.id
ORDER BY last_sync_time DESC;


-- Catchment size (number of individuals) per user — the device-pull bound for
-- address-synced subject types. The lineage <@ join includes individuals registered
-- at descendant address levels of the catchment's mapped levels.
SELECT u.id, u.username, c.name AS catchment, COUNT(DISTINCT i.id) AS individuals
FROM users u
         JOIN catchment c                 ON c.id = u.catchment_id
         JOIN catchment_address_mapping m ON m.catchment_id = c.id
         JOIN address_level cal           ON cal.id = m.addresslevel_id
         JOIN address_level ial           ON ial.lineage <@ cal.lineage
         JOIN individual i                ON i.address_id = ial.id
    AND i.organisation_id = u.organisation_id
    AND i.is_voided = false
WHERE u.id IN (9815, 9816)
GROUP BY u.id, u.username, c.name
ORDER BY individuals DESC;

set role none;

-- Migration scope: custom (org-authored) report cards that are ACTIVE — i.e. reachable by users.
-- A card is active only if the full chain is alive:
--   card → placed in a section → section on a dashboard → dashboard assigned to a group → group exists.
-- Every hop is voided-checked; a break anywhere means no user can see the card.
select distinct                       -- distinct: a dashboard assigned to several groups would
                                      -- otherwise repeat its cards once per group
                                      rc.organisation_id,
                                      rc.id      as card_id,
                                      rc.name    as card_name,
                                      rc.query   as card_query,      -- the org-authored logic — this text is what must survive
                                      -- SQLite query translation (RealmQueryParser corpus)
                                      d.name     as dashboard,
                                      ds.name    as section

from report_card rc

         -- card is placed in some dashboard section
         join dashboard_section_card_mapping dscm
              on dscm.card_id = rc.id
                  and dscm.is_voided = false

    -- ... and that section still exists
         join dashboard_section ds
              on ds.id = dscm.dashboard_section_id
                  and ds.is_voided = false

    -- ... on a dashboard that still exists
         join dashboard d
              on d.id = ds.dashboard_id
                  and d.is_voided = false

    -- ... which is assigned to at least one user group (unassigned dashboards are configured
    -- but dead — nobody is ever shown them)
         join group_dashboard gd
              on gd.dashboard_id = d.id
                  and gd.is_voided = false

    -- ... and that group itself is not voided (a voided group can leave a live-looking
    -- group_dashboard row behind)
         join groups g
              on g.id = gd.group_id
                  and g.is_voided = false

where rc.is_voided = false
  -- custom cards only: standard-type cards (approvals, scheduled/overdue visits, comments,
  -- tasks, ...) run app-owned query code, covered once by app-side testing — out of scope
  -- for the per-org inventory
  and rc.standard_report_card_type_id is null
  -- the 56 orgs marked production/active (deduplicated)
  and rc.organisation_id in (7,10,11,19,21,32,38,42,62,64,78,105,115,118,129,156,160,172,
                             184,214,215,229,233,272,323,347,348,391,401,446,474,478,481,
                             490,521,538,583,652,664,702,715,730,731,821,956,983,1014,1036,
                             1057,1073,1100,1103,1104,1108,1113,1129)

order by rc.organisation_id, d.name, ds.name, rc.name;

-- 643

-- Standard-type cards with their scoping filters (subject types / programs / encounter types),
-- resolved to names from the standard_report_card_input jsonb. A visit-flavored card with BOTH
-- programs and encounter types scoped makes the app compose the OR-spanning-SUBQUERY shape (#2076).
select distinct
    rc.organisation_id,
    rc.id        as card_id,
    rc.name      as card_name,
    srct.name    as standard_type,
    sts.names    as input_subject_types,
    prs.names    as input_programs,
    ets.names    as input_encounter_types,
    rc.standard_report_card_input ->> 'recentDuration' as recent_duration,
    d.name       as dashboard,
    ds.name      as section

from report_card rc
         join standard_report_card_type srct
              on srct.id = rc.standard_report_card_type_id
         join dashboard_section_card_mapping dscm
              on dscm.card_id = rc.id and dscm.is_voided = false
         join dashboard_section ds
              on ds.id = dscm.dashboard_section_id and ds.is_voided = false
         join dashboard d
              on d.id = ds.dashboard_id and d.is_voided = false
         join group_dashboard gd
              on gd.dashboard_id = d.id and gd.is_voided = false
         join groups g
              on g.id = gd.group_id and g.is_voided = false

         left join lateral (
    select string_agg(st.name, ', ') as names
    from jsonb_array_elements_text(coalesce(rc.standard_report_card_input -> 'subjectTypes', '[]'::jsonb)) u
             join subject_type st on st.uuid = u
    ) sts on true
         left join lateral (
    select string_agg(p.name, ', ') as names
    from jsonb_array_elements_text(coalesce(rc.standard_report_card_input -> 'programs', '[]'::jsonb)) u
             join program p on p.uuid = u
    ) prs on true
         left join lateral (
    select string_agg(et.name, ', ') as names
    from jsonb_array_elements_text(coalesce(rc.standard_report_card_input -> 'encounterTypes', '[]'::jsonb)) u
             join encounter_type et on et.uuid = u
    ) ets on true
where rc.is_voided = false
  and rc.standard_report_card_type_id is not null
  and rc.organisation_id in (7,10,11,19,21,32,38,42,62,64,78,105,115,118,129,156,160,172,
                             184,214,215,229,233,272,323,347,348,391,401,446,474,478,481,
                             490,521,538,583,652,664,702,715,730,731,821,956,983,1014,1036,
                             1057,1073,1100,1103,1104,1108,1113,1129)
order by rc.organisation_id, d.name, ds.name, rc.name;
