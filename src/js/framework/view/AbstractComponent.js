import React, {Component} from 'react';

class AbstractComponent extends Component {
    constructor(props, context) {
        super(props, context);
    }

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func
    };

    dispatchAction(action) {
        this.context.getStore().dispatch({"type": action});
    }

}

export default AbstractComponent;
