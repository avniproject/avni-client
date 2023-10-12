import BaseIntegrationTest from "./BaseIntegrationTest";
import {UserInfo} from "openchs-models";
import TestUserInfoFactory from "../test/model/TestUserInfoFactory";
import UserInfoService from "../src/service/UserInfoService";
import TestSubjectTypeFactory from "../test/model/TestSubjectTypeFactory";
import _ from "lodash";
import {assert} from "chai";

class UserInfoServiceTest extends BaseIntegrationTest {
    sync_concept_value_exists() {
        const syncSettings = `{
  "subjectTypeSyncSettings": [
    {
      "syncConcept1": "be0ab05f-b0f3-43ec-b598-fdde0679104a",
      "syncConcept2": null,
      "subjectTypeUUID": "ec69af69-8fd2-40b3-b429-025504c18a01",
      "syncConcept1Values": [
        "8ebbf088-f292-483e-9084-7de919ce67b7"
      ],
      "syncConcept2Values": []
    }
  ]
}
`;
        this.executeInWrite((db) => {
            const userInfo = db.create(UserInfo, TestUserInfoFactory.createWithDefaults({syncSettings: syncSettings}));
        });
        const subjectType = TestSubjectTypeFactory.createWithDefaults({uuid: "ec69af69-8fd2-40b3-b429-025504c18a01"});
        const syncConcept1Values = this.getService(UserInfoService).getSyncConcept1Values(subjectType);
        assert.equal(true, _.includes(syncConcept1Values, "8ebbf088-f292-483e-9084-7de919ce67b7"));
    }
}

export default UserInfoServiceTest;
