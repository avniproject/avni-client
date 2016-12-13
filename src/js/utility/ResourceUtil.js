import _ from "lodash";

class ResourceUtil {
    static getUUIDFor(resource, property) {
        const prop = resource["_links"][`${property}`];
        if (_.isNil(prop)) return undefined;
        return prop["href"];
    }
}

export default ResourceUtil;