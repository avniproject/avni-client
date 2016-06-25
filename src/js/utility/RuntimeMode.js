class RuntimeMode {
    static runningTest() {
        return process.env.npm_package_scripts_test !== undefined && process.env.npm_package_scripts_test.includes('react-native-mock');
    }
}

export default RuntimeMode;