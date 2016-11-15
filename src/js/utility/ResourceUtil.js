class ResourceUtil {
    static getUUIDFor(resource, property) {
        return resource["_links"][`${property}UUID`]["href"];
    }
}

export default ResourceUtil;