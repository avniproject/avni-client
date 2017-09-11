CREATE OR REPLACE FUNCTION test()
  RETURNS VOID AS $$
  DECLARE foo RECORD;
  DECLARE metaDataVersionName VARCHAR(50) := 'test';
BEGIN
    SELECT id INTO foo from openchs.health_metadata_version where name = metaDataVersionName;
    IF foo is NULL THEN
      INSERT INTO openchs.health_metadata_version (name) VALUES (metaDataVersionName);
    ELSE
      raise notice 'EncounterForm already run... %', metaDataVersionName;
      RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT test();

DROP FUNCTION test();