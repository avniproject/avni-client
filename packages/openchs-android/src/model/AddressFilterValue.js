import _ from 'lodash';

class AddressFilterValue {
    constructor(selectedAddresses = [], anyActiveTypes = []) {
        this.selectedAddresses = selectedAddresses;
        this.anyActiveTypes = anyActiveTypes;
    }

    static empty() {
        return new AddressFilterValue([], []);
    }

    static from(raw) {
        if (_.isNil(raw)) return AddressFilterValue.empty();
        if (raw instanceof AddressFilterValue) {
            return new AddressFilterValue([...raw.selectedAddresses], [...raw.anyActiveTypes]);
        }
        if (_.isArray(raw)) return new AddressFilterValue([...raw], []);
        return new AddressFilterValue(
            raw.selectedAddresses ? [...raw.selectedAddresses] : [],
            raw.anyActiveTypes ? [...raw.anyActiveTypes] : []
        );
    }

    isEmpty() {
        return _.isEmpty(this.selectedAddresses) && _.isEmpty(this.anyActiveTypes);
    }

    concreteSelections() {
        return this.selectedAddresses.filter(a => !_.includes(this.anyActiveTypes, a.type));
    }
}

export default AddressFilterValue;
