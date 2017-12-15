import StubbedBaseService from "./StubbedBaseService";
import {Settings} from "openchs-models";

class StubbedUserInfoService extends StubbedBaseService {
    constructor(serviceData) {
        super(serviceData);
    }

    getUserInfo() {
        return {catchmentType: "", organisationName: ""};
    }
}

export default StubbedUserInfoService;