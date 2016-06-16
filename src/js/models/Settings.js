class Settings {
    static schema = {
        name: 'Settings',
        properties: {
            serverURL: 'string',
            locale: {"type": "Locale"}
        }
    };
}

export default Settings;