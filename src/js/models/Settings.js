class Settings {
    static UUID = '2aa81079-38c3-4d9f-8380-f50544b32b3d';

    static schema = {
        name: 'Settings',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            serverURL: 'string',
            catchment: 'int',
            locale: {"type": "LocaleMapping"},
            logLevel: 'int'
        }
    };

    clone() {
        const settings = new Settings();
        settings.uuid = this.uuid;
        settings.serverURL = this.serverURL;
        settings.catchment = this.catchment;
        settings.locale = this.locale;
        settings.logLevel = this.logLevel;
        return settings;
    }
}

export default Settings;