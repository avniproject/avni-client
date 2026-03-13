class EncounterServiceUtil {
    static isNotFilled(repository, entity) {
        const encounters = repository.findAll().filtered("uuid = $0", entity.uuid);
        if (encounters.length === 0) return true;
        return encounters.filtered("encounterDateTime = null").length > 0;
    }
}

export default EncounterServiceUtil;
