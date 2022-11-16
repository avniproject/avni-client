import _ from "lodash";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, View} from "react-native";
import GlobalStyles from "../primitives/GlobalStyles";
import React from "react";
import PropTypes from "prop-types";

class ZeroResults extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        count: PropTypes.number
    }

    static defaultProps = {
        count: 0
    }

    render() {
        return <View>
            {this.props.count === 0 && <Text style={GlobalStyles.emptyListPlaceholderText}>{this.I18n.t('zeroNumberOfResults')}</Text>}
        </View>;
    }
}

export default ZeroResults;
