class EncounterServiceUtil {
    static isNotFilled(db, schema, entity) {
        return db.objects(schema).filtered("uuid = $0 and encounterDateTime = null", entity.uuid).length > 0;
    }
}

export default EncounterServiceUtil;
