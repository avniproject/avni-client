class Settings {
    static schema = {
        name: 'Settings',
        properties: {
            serverURL: 'string',
            catchment: 'string',
            locale: {"type": "Locale"}
        }
    };
}

export default Settings;