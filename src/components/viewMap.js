import DiseaseList from './diseaseView.js';

class ViewMap {
    constructor() {
        this.viewMap = {"diseaseList": DiseaseList};
    }

    defaultView() {
        return "diseaseList";
    }

    get(viewName) {
        return this.viewMap[viewName];
    }
}
export default ViewMap;