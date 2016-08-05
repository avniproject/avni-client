import {createStore} from 'redux';

// const AppStore = function (initState = {
//     concepts: [],
//     questionnaires: []
// }, action) {
//     switch (action.type) {
//         case "ADD_CONCEPTS":
//             initState.concepts = action.data;
//     }
// };
//

class AppStore {
    constructor(db, beans) {
        this.db = new Realm(models);
        this.beans = BeanRegistry.init(this.db, this);
        this.getBean = this.getBean.bind(this);
        BootstrapRegistry.init(this.getBean);
        BootstrapRegistry.runAllTasks();
    };
}


export default AppStore;