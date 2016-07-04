class RuntimeMode {
    static runningTest() {
        return process.env.npm_package_scripts_test !== undefined;
    }
}

export default RuntimeMode;