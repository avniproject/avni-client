class ConfigFile {
    static schema = {
        name: "ConfigFile",
        primaryKey: "fileName",
        properties: {
            fileName: "string",
            contents: "string"
        }
    };

    static create(fileName, contents) {
        const configFile = new ConfigFile();
        configFile.fileName = fileName.toLowerCase();
        configFile.contents = contents;
        return configFile;
    }

    toString() {
        return this.fileName;
    }
}

export default ConfigFile;