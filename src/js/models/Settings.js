class Settings {
    static schema = {
        name: 'Settings',
        properties: {
            serverURL: 'string',
            'locale': {"type": "data", "objectType": "Locale"},
        },
    };
}

export default Settings;