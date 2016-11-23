class ResourceUtil {
    static getUUIDFor(resource, property) {
        return resource["_links"][`${property}`]["href"];
    }
}

export default ResourceUtil;