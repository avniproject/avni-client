import _ from "lodash";

function valueMapper(x) {
    return x.uuid;
}

function labelValueMapper(x) {
    return {label: x.name, value: valueMapper(x)};
}

class NamedSelectableEntities {
    entities;

    static createEmpty() {
        const namedEntities = new NamedSelectableEntities();
        namedEntities.entities = [];
        return namedEntities;
    }

    static create(entities) {
        const namedEntities = new NamedSelectableEntities();
        namedEntities.entities = entities;
        return namedEntities;
    }

    toggle(selectedEntities, uuid, isMulti = false) {
        const toggledEntity = _.find(this.entities, x => valueMapper(x) === uuid);
        const removedEntities = _.remove(selectedEntities, x => valueMapper(x) === uuid);
        if (isMulti) {
            if (removedEntities.length > 0) {
                return selectedEntities;
            } else {
                return [...selectedEntities, toggledEntity];
            }
        } else {
            return removedEntities.length > 0 ? [] : [toggledEntity];
        }
    }

    clone() {
        const namedEntities = new NamedSelectableEntities();
        namedEntities.entities = this.entities;
        return namedEntities;
    }

    getSelectedValue(selectedEntities, isMulti = false) {
        if (isMulti) {
            return selectedEntities.map(labelValueMapper);
        } else if (selectedEntities.length === 0) {
            return null;
        } else {
            return labelValueMapper(selectedEntities[0]);
        }
    }

    getOptions() {
        return this.entities.map(labelValueMapper);
    }
}

export default NamedSelectableEntities;
