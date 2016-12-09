import _ from "lodash";

class BaseEntity {
    static addNewChild(child, existingChildren) {
        var existing = existingChildren.find((child) => {
            return child.uuid === child.uuid;
        });
        if (_.isNil(existing))
            existingChildren.push(child);
    }
}

export default BaseEntity;