import Task from './Task';
import Bootstrap from '../framework/bootstrap/Bootstrap';
import Actions from '../action';

@Bootstrap("configLoad")
class ConfigLoad extends Task {
    constructor(dispatch) {
        super(dispatch);
        this.run = this.run.bind(this);
    }

    run() {
        this.dispatchAction(Actions.GET_CONFIG, ()=>this.dispatchAction(Actions.GET_QUESTIONNAIRES));
    }
}

export default ConfigLoad;