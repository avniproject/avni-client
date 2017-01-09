import {expect} from 'chai';
import IndividualSearchCriteria from "../../../js/service/query/IndividualSearchCriteria";

describe('IndividualSearchCriteria', () => {
    it('getFilterCriteria', () => {
        var criteria = IndividualSearchCriteria.create("ga", 23, ["Jinjgaon"]);
        var filterCriteria = criteria.getFilterCriteria();
    });
});