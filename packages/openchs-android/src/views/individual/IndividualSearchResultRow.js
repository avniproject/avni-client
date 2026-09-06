import {TouchableNativeFeedback, View} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from "react";
import Colors from "../primitives/Colors";
import IndividualDetailsCard from "../common/IndividualDetailsCard";
import {Individual} from "openchs-models";
import MIcon from 'react-native-vector-icons/MaterialIcons';
import _ from "lodash";

class IndividualSearchResultRow extends Component {
    static propTypes = {
        item: PropTypes.any.isRequired,
        onResultRowPress: PropTypes.func.isRequired,
        checked: PropTypes.bool
    }

    constructor(props, context) {
        super(props, context);
        this.individual = new Individual(props.item);
        this.onPress = () => this.props.onResultRowPress(this.individual);
    }

    // A row is a pure render of an immutable item, which is what keeps scrolling cheap on the
    // large result sets. Only a checkbox changing has to get through.
    shouldComponentUpdate(nextProps) {
        return this.props.checked !== nextProps.checked;
    }

    render() {
        const {checked} = this.props;
        const card = <IndividualDetailsCard individual={this.individual}/>;
        return <TouchableNativeFeedback key={this.individual.uuid} onPress={this.onPress}
                                        background={TouchableNativeFeedback.SelectableBackground()}>
            {_.isNil(checked) ? <View>{card}</View> :
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <MIcon name={checked ? 'check-box' : 'check-box-outline-blank'}
                           style={{
                               color: checked ? Colors.ActionButtonColor : Colors.InputBorderNormal,
                               fontSize: 24,
                               paddingHorizontal: 12
                           }}/>
                    <View style={{flex: 1}}>{card}</View>
                </View>}
        </TouchableNativeFeedback>;
    }
}

export default IndividualSearchResultRow;
