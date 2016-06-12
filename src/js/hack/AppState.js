let instance = null;

class AppState {
    constructor() {
        if (!instance) {
            instance = this;
        }
        return instance;
    }
}
export default new AppState();