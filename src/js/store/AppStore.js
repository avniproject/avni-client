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
        this.db = db;
        this.beans = beans;
    };

    store(initState = {}, action) {

    }

    buildStore() {
        return
    }

}


export default AppStore;