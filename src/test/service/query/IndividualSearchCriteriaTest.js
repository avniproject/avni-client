import {expect} from 'chai';
import IndividualSearchCriteria from "../../../js/service/query/IndividualSearchCriteria";

describe('IndividualSearchCriteria', () => {
    it('getFilterCriteria', () => {
        console.log(new Date());
        var criteria = new IndividualSearchCriteria("ga", 23, "Jinjgaon");
        var filterCriteria = criteria.getFilterCriteria();
        console.log(filterCriteria);
    });
});