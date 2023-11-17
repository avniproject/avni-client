import General from "../../src/utility/General";
import {EncounterType} from 'openchs-models';

class TestEncounterTypeFactory {
    static create({uuid = General.randomUUID(), name = General.randomUUID()}) {
        const encounterType = new EncounterType();
        encounterType.uuid = uuid;
        encounterType.name = name;
        encounterType.displayName = name;
        return encounterType;
    }
}

export default TestEncounterTypeFactory;
