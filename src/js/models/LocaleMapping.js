export default class LocaleMapping {
    static schema = {
        name: "LocaleMapping",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            locale: "string",
            displayText: "string"
        }
    };
}