import _ from 'lodash';

function adjustForDisplayedLevels(allCurrentLevels, selectedLevel, newLevels, anyActiveTypes) {
    const toRemove = allCurrentLevels.filter(l => l.level < selectedLevel.level && l.parentUuid !== selectedLevel.parentUuid);
    return new AddressLevelsState(allCurrentLevels, anyActiveTypes)
        .removeLevels(toRemove)
        .addLevels(newLevels)
        .removeUnwantedLevels();
}

class AddressLevelsState {
    constructor(levels = [], anyActiveTypes = new Set()) {
        const unsortedLevels = Object.entries(_.uniqBy(levels, l => l.uuid)
            .reduce((acc, {locationMappings, uuid, name, level, type, parentUuid, typeUuid, isSelected = false}) => {
                const accumulatorKey = level + "->" + type;
                // accumulating just by type affects our ability to sort the levels. accumulating just by level affects our ability to group levels of the same type
                // hence using a composite key of level + type with a separator
                acc[accumulatorKey] = _.defaultTo(acc[accumulatorKey], []).concat([{
                    uuid,
                    name,
                    level,
                    type,
                    parentUuid,
                    typeUuid,
                    isSelected,
                    locationMappings
                }]);
                return acc;
            }, {}));
        const sortedLevels = _.orderBy(unsortedLevels, ([levelKey, value]) => {
            const level = parseInt(levelKey.split("->")[0]);
            return level;
        }, ['desc']);
        this.levels = sortedLevels.map(([levelKey, levels]) => {
            const levelType = levels[0].type;
            const other = _.find(levels, (level) => _.startsWith(level.name, "Other"));
            if (!_.isNil(other)) {
                const levelsExcludingOther = _.filter(levels, (level) => level.name !== other.name);
                const sortedLevels = _.sortBy(levelsExcludingOther, "name");
                const levelsEndingWithOther = _.concat(sortedLevels, other);
                return [levelType, levelsEndingWithOther];
            } else {
                return [levelType, _.sortBy(levels, "name")];
            }
        });
        const visibleTypes = new Set(this.levels.map(([levelType]) => levelType));
        this.anyActiveTypes = new Set([...anyActiveTypes].filter(t => visibleTypes.has(t)));
    }

    canBeUsed(level) {
        return level.isSelected
            || this.anyActiveTypes.has(level.type)
            || level.level === this.maxSelectedLevel
            || (_.isEmpty(this.selectedAddresses) && this.anyActiveTypes.size === 0)
            || _.isEmpty(level.locationMappings);
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

    isAnyActive(levelType) {
        return this.anyActiveTypes.has(levelType);
    }

    get lowestSelectedAddresses() {
        if (_.isEmpty(this.selectedAddresses)) return [];
        const minLevel = _.minBy(this.selectedAddresses, l => l.level).level;
        return this.selectedAddresses.filter(l => l.level === minLevel);
    }

    addLevel(type, selectedLevel, newLevels = []) {
        let levelMap = new Map(this.levels);
        const levels = levelMap.get(type);
        levelMap.set(type, levels.map(l => _.assignIn({}, l, {
            isSelected: l.uuid === selectedLevel.uuid ? !l.isSelected : l.isSelected
        })));
        const nextAnyActive = new Set(this.anyActiveTypes);
        nextAnyActive.delete(type);
        return new AddressLevelsState(this._asList(levelMap), nextAnyActive).addOrRemoveLevels(selectedLevel.uuid, newLevels).removeUnwantedLevels();
    }

    selectLevel(selectedLevel, newLevels = []) {
        const allCurrentLevels = this._asList();
        allCurrentLevels.filter(it => it.level === selectedLevel.level).forEach(l => {
            l.isSelected = l.uuid === selectedLevel.uuid ? !l.isSelected : false
        });
        const nextAnyActive = new Set(this.anyActiveTypes);
        nextAnyActive.delete(selectedLevel.type);
        return adjustForDisplayedLevels(allCurrentLevels, selectedLevel, newLevels, nextAnyActive);
    }

    activateAny(levelType, newLevels = []) {
        const allCurrentLevels = this._asList().map(l =>
            l.type === levelType ? _.assignIn({}, l, {isSelected: false}) : l
        );
        const nextAnyActive = new Set(this.anyActiveTypes);
        nextAnyActive.add(levelType);
        return new AddressLevelsState(allCurrentLevels, nextAnyActive).addLevels(newLevels).removeUnwantedLevels();
    }

    deactivateAny(levelType) {
        const nextAnyActive = new Set(this.anyActiveTypes);
        nextAnyActive.delete(levelType);
        const idx = this.levels.findIndex(([type]) => type === levelType);
        if (idx === -1) {
            return new AddressLevelsState(this._asList(), nextAnyActive).removeUnwantedLevels();
        }
        const keepItems = _.flatten(this.levels.slice(0, idx + 1).map(([, items]) => items));
        return new AddressLevelsState(keepItems, nextAnyActive).removeUnwantedLevels();
    }

    addLevels(levels) {
        return new AddressLevelsState(this._asList().concat(levels), this.anyActiveTypes);
    }

    removeLevels(levels) {
        const allChildren = this.findAllChildrenFromCurrentLevels(levels);
        return new AddressLevelsState(_.differenceBy(this._asList(), allChildren, (a) => a.uuid), this.anyActiveTypes);
    }

    removeUnwantedLevels() {
        const levels = this._asList();
        const getParent = parentUUID => _.filter(levels, it => it.uuid === parentUUID);
        return new AddressLevelsState(levels.filter(l => {
            return this.canBeUsed(l) || _(getParent(l.parentUuid)).reject(p => _.isNil(p) || (!p.isSelected && !this.anyActiveTypes.has(p.type)))
                .some(p => this.canBeUsed(p));
        }), this.anyActiveTypes);
    }

    addOrRemoveLevels(selectedLevelUUID, levels) {
        return this.isSelected(selectedLevelUUID) ?
            this.addLevels(levels) :
            this.removeLevels(levels);
    }

    defaultTo(state) {
        return _.isEmpty(this.selectedAddresses) && this.anyActiveTypes.size === 0 ? state : this;
    }

    clone() {
        return new AddressLevelsState(Array.from(this._asList()), new Set(this.anyActiveTypes));
    }

    get selectedAddressLevelUUIDs() {
        return _.map(this.selectedAddresses, ({uuid}) => uuid);
    }

    get anyActiveTypesArray() {
        return [...this.anyActiveTypes];
    }

    get effectiveAddresses() {
        const byUuid = new Map();
        this.selectedAddresses.forEach(a => byUuid.set(a.uuid, a));
        this.levels.forEach(([levelType, items]) => {
            if (this.anyActiveTypes.has(levelType)) {
                items.forEach(a => {
                    if (!byUuid.has(a.uuid)) byUuid.set(a.uuid, a);
                });
            }
        });
        return [...byUuid.values()];
    }

    get lowestEffectiveAddresses() {
        const effective = this.effectiveAddresses;
        if (_.isEmpty(effective)) return [];
        const minLevel = _.minBy(effective, l => l.level).level;
        return effective.filter(l => l.level === minLevel);
    }

    findAllChildrenFromCurrentLevels(levels = []) {
        if (_.isEmpty(levels)) {
            return levels;
        }
        const parentUUIDs = _.defaultTo(levels.map(p => p.uuid), []);
        const children = this._asList().filter(l => _.includes(parentUUIDs, l.parentUuid));
        return _.concat(levels, this.findAllChildrenFromCurrentLevels(children));
    }

    setSelectedAddresses(addresses) {
        const thisObject = this;
        addresses.forEach(selectedAddress => {
            const matchingAddress = _.find(thisObject._asList(), (address) => selectedAddress.uuid === address.uuid);
            if (matchingAddress) {
                matchingAddress.isSelected = true;
            }
        });
    }
}

export default AddressLevelsState;
