import _ from "lodash";
import ValidationResult from "./application/ValidationResult";

class BaseEntity {
    static addNewChild(newChild, existingChildren) {
        const existing = existingChildren.find((child) => {
            return newChild.uuid === child.uuid;
        });
        if (_.isNil(existing))
            existingChildren.push(newChild);
    }

    static collectionHasEntity(collection, entity) {
        return _.findIndex(collection, function (item) {
                return item.uuid === entity.uuid;
            }) !== -1;
    }

    static removeFromCollection(collection, entity) {
        _.remove(collection, function (item) {
            return item.uuid === entity.uuid;
        });
    }

    equals(other) {
        return !_.isNil(other) && (other.uuid === this.uuid);
    }

    validateField(value, key) {
        return _.isEmpty(value) ? new ValidationResult(false, key, 'emptyValidationMessage') : ValidationResult.successful(key);
    }
}

export default BaseEntity;