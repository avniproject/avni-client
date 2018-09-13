import _ from 'lodash';

class AddressLevelsState {
    constructor(levels = []) {
        this.levels = Object.entries(_.uniqBy(levels, l => l.uuid)
            .reduce((acc, {uuid, name, level, type, locationMappings, isSelected = false}) => {
                acc[type] = _.defaultTo(acc[type], []).concat([{
                    uuid,
                    name,
                    level,
                    type,
                    locationMappings,
                    isSelected
                }]);
                return acc;
            }, {}));
    }

    _asList(levelMap = new Map(this.levels)) {
        return _.flatten([...levelMap.values()]);
    }


    get selectedAddresses() {
        return this._asList().filter(l => l.isSelected);
    }

    get lowestSelectedAddresses() {
        if (_.isEmpty(this.selectedAddresses)) return [];
        const minLevel = _.minBy(this.selectedAddresses, l => l.level).level;
        return this.selectedAddresses.filter(l => l.level === minLevel);
    }


    selectLevel(type, selectedLevelUUID, exclusive = false) {
        let levelMap = new Map(this.levels);
        const levels = levelMap.get(type);
        levelMap.set(type, levels.map(l => ({
            ...l,
            isSelected: l.uuid === selectedLevelUUID ? !l.isSelected : !exclusive && l.isSelected
        })));
        return new AddressLevelsState(this._asList(levelMap));
    }

    addLevels(levels) {
        return new AddressLevelsState(this._asList().concat(levels));
    }

    removeLevels(levels) {
        return new AddressLevelsState(_.differenceBy(this._asList(), levels, (a) => a.uuid));
    }

    addOrRemoveLevels(selectedLevelUUID, levels) {
        return this._asList().find(l => l.uuid === selectedLevelUUID).isSelected ?
            this.addLevels(levels) :
            this.removeLevels(levels);
    }

    defaultTo(state) {
        return _.isEmpty(this.selectedAddresses) ? state : this;
    }
}

export default AddressLevelsState;