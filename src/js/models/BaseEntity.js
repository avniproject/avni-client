import _ from "lodash";

class BaseEntity {
    static addNewChild(newChild, existingChildren) {
        const existing = existingChildren.find((child) => {
            return newChild.uuid === child.uuid;
        });
        if (_.isNil(existing))
            existingChildren.push(newChild);
    }
}

export default BaseEntity;