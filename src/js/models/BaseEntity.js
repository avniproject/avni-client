import _ from "lodash";

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
}

export default BaseEntity;