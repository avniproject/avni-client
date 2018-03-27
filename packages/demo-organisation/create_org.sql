CREATE ROLE demo
  NOINHERIT
  NOLOGIN;

GRANT demo TO openchs;

GRANT ALL ON ALL TABLES IN SCHEMA public TO demo;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO demo;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO demo;

INSERT INTO organisation (name, db_user, uuid)
VALUES ('demo', 'demo', '0de3e67a-acc9-4023-915b-ad9ae273a6d9');
