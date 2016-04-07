class ViewWrapper {
    constructor(path, component) {
        this._path = path;
        this._component = component;
    }

    component() {
        return this._component;
    }

    path() {
        return this._path;
    }
}

export default ViewWrapper;