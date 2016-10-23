import {expect} from 'chai';
import IndividualSearchCriteria from "../../../js/service/query/IndividualSearchCriteria";

describe('IndividualSearchCriteria', () => {
    it('getFilterCriteria', () => {
        var criteria = new IndividualSearchCriteria("ga", 23, "Jinjgaon");
        var filterCriteria = criteria.getFilterCriteria();
        expect(filterCriteria).to.equal('name CONTAINS[c] "ga" AND age == 23 AND lowestAddressLevel.title == "Jinjgaon"');
    });
});