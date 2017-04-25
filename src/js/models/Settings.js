class Settings {
    static schema = {
        name: 'Settings',
        properties: {
            serverURL: 'string',
            catchment: 'int',
            locale: {"type": "Locale"},
            logLevel: 'int'
        }
    };
}

export default Settings;