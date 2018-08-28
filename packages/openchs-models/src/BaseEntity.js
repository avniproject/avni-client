import _ from "lodash";
import ValidationResult from "./application/ValidationResult";

class BaseEntity {
    static fieldKeys = {
        EXTERNAL_RULE: 'EXTERNAL_RULE'
    };

    static mergeOn(key) {
        return (entities) => {
            return entities.reduce((acc, entity) => {
                let existingChildren = acc[key];
                entity[key].forEach(child => BaseEntity.addNewChild(child, existingChildren));
                entity[key] = existingChildren;
                return entity;
            })
        }
    }

    static addNewChild(newChild, existingChildren) {
        if (!BaseEntity.collectionHasEntity(existingChildren, newChild)) {
            existingChildren.push(newChild);
        }
    }

    static collectionHasEntity(collection, entity) {
        return _.some(collection, item => item.uuid === entity.uuid);
    }

    static removeFromCollection(collection, entity) {
        _.remove(collection, item => item.uuid === entity.uuid);
    }

    equals(other) {
        return !_.isNil(other) && (other.uuid === this.uuid);
    }

    validateFieldForEmpty(value, key) {
        if (value instanceof Date) {
            return _.isNil(value) ? ValidationResult.failure(key, 'emptyValidationMessage') : ValidationResult.successful(key);
        }
        return _.isEmpty(value) ? ValidationResult.failure(key, 'emptyValidationMessage') : ValidationResult.successful(key);
    }

    print() {
        return this.toString();
    }
}
export default BaseEntity;