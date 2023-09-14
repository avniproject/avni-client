import {Encounter} from 'openchs-models';
import GlobalContext from "../src/GlobalContext";
import {assert} from "chai";

class DatabaseTest {
    shouldReturnFirstElementAsNilIfCollectionIsEmpty() {
        const db = GlobalContext.getInstance().db;
        assert.equal(null, db.objects(Encounter.schema.name)[0]);
        assert.equal(null, db.objects(Encounter.schema.name).filtered("uuid = '1'")[0]);
    }
}

export default DatabaseTest;
