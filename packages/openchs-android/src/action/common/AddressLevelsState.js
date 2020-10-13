import _ from 'lodash';

class AddressLevelsState {
    constructor(levels = []) {
        const unsortedLevels = Object.entries(_.uniqBy(levels, l => l.uuid)
            .reduce((acc, {uuid, name, level, type, parentUuid, typeUuid, isSelected = false}) => {
                acc[type] = _.defaultTo(acc[type], []).concat([{
                    uuid,
                    name,
                    level,
                    type,
                    parentUuid,
                    typeUuid,
                    isSelected
                }]);
                return acc;
            }, {}));
        this.levels = unsortedLevels.map(([levelType, levels]) => {
            const other = _.find(levels, (level) => _.startsWith(level.name, "Other"));
            if(!_.isNil(other)) {
                const levelsExcludingOther = _.filter(levels, (level) => level.name !== other.name);
                const sortedLevels = _.sortBy(levelsExcludingOther, "name");
                const levelsEndingWithOther = _.concat(sortedLevels, other);
                return [levelType, levelsEndingWithOther];
            } else {
                return [levelType, _.sortBy(levels, "name")];
            }

        });
    }

    canBeUsed(level) {
        return level.isSelected || level.level === this.maxSelectedLevel || _.isEmpty(this.selectedAddresses);
    }

    _asList(levelMap = new Map(this.levels)) {
        return _.flatten([...levelMap.values()]);
    }

    get maxSelectedLevel() {
        if (_.isEmpty(this.selectedAddresses)) return null;
        return _.maxBy(this.selectedAddresses, l => l.level).level
    }

    get selectedAddresses() {
        return this._asList().filter(l => l.isSelected);
    }

    isSelected(uuid) {
        return this.selectedAddresses.some(sa => sa.uuid === uuid);
    }

    get lowestSelectedAddresses() {
        if (_.isEmpty(this.selectedAddresses)) return [];
        const minLevel = _.minBy(this.selectedAddresses, l => l.level).level;
        return this.selectedAddresses.filter(l => l.level === minLevel);
    }

    addLevel(type, selectedLevel, newLevels = []) {
        let levelMap = new Map(this.levels);
        const levels = levelMap.get(type);
        levelMap.set(type, levels.map(l => _.assignIn({},l,{
            isSelected: l.uuid === selectedLevel.uuid ? !l.isSelected : l.isSelected
        })));
        return new AddressLevelsState(this._asList(levelMap)).addOrRemoveLevels(selectedLevel.uuid, newLevels).removeUnwantedLevels();
    }

    selectLevel(type, selectedLevel, newLevels = []) {
        const allCurrentLevels = this._asList();
        allCurrentLevels.filter(it => it.level === selectedLevel.level).forEach(l => {
            l.isSelected = l.uuid === selectedLevel.uuid ? !l.isSelected : false
        });
        const toRemove = allCurrentLevels.filter(l => l.level < selectedLevel.level && l.parentUuid !== selectedLevel.parentUuid);
        return new AddressLevelsState(allCurrentLevels).addLevels(newLevels)
            .removeLevels(toRemove)
            .removeUnwantedLevels();
    }

    addLevels(levels) {
        return new AddressLevelsState(this._asList().concat(levels));
    }

    removeLevels(levels) {
        return new AddressLevelsState(_.differenceBy(this._asList(), levels, (a) => a.uuid));
    }

    removeUnwantedLevels() {
        const levels = this._asList();
        const getParent = parentUUID => _.filter(levels, it => it.uuid === parentUUID);
        return new AddressLevelsState(levels.filter(l => {
            return this.canBeUsed(l) || _(getParent(l.parentUuid)).reject(_.isNil)
                .some(this.canBeUsed);
        }));
    }

    addOrRemoveLevels(selectedLevelUUID, levels) {
        return this.isSelected(selectedLevelUUID) ?
            this.addLevels(levels) :
            this.removeLevels(levels);
    }

    defaultTo(state) {
        return _.isEmpty(this.selectedAddresses) ? state : this;
    }

    clone() {
        return new AddressLevelsState(Array.from(this._asList()));
    }
}

export default AddressLevelsState;
