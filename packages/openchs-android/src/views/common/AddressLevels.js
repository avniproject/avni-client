import React from "react";
import _ from 'lodash';
import {View, Text} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Reducers from "../../reducer";
import Fonts from "../primitives/Fonts";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import General from "../../utility/General";
import AddressLevel from "./AddressLevel";
import {Actions} from '../../action/common/AddressLevelsActions';

class AddressLevels extends AbstractComponent {
    static defaultProps = {
        onSelect: _.noop,
        onLowestLevel: _.noop
    };
    static propTypes = {
        multiSelect: React.PropTypes.bool,
        onSelect: React.PropTypes.func,
        onLowestLevel: React.PropTypes.func,
        validationError: React.PropTypes.object
    };

    viewName() {
        return 'AddressLevels';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.addressLevels);
    }

    componentDidMount() {
        this.dispatchAction(Actions.ON_LOAD, {});
    }

    _invokeCallbacks() {
        if(_.isFunction(this.props.onSelect)){
            this.props.onSelect(this.state.data.lowestSelectedAddresses);
        }
        if (this.state.onLowest && _.isFunction(this.props.onLowestLevel)) {
            this.props.onLowestLevel(this.state.data.lowestSelectedAddresses);
        }
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        let addressLevels = this.state.data.levels.map(([levelType, levels], idx) =>
            <AddressLevel
                onSelect={() => this._invokeCallbacks()}
                key={idx}
                validationError={this.props.validationError}
                levelType={levelType}
                multiSelect={this.props.multiSelect}
                levels={levels}/>);
        return (
            <View>
                {addressLevels}
            </View>
        );
    }
}

export default AddressLevels;