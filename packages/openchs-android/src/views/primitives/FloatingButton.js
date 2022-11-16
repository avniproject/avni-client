import _ from "lodash";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, TouchableOpacity, View} from "react-native";
import Colors from "./Colors";
import Styles from "./Styles";
import PropTypes from "prop-types";
import React from 'react';

class FloatingButton extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        buttonTextKey: PropTypes.string.isRequired,
        onClick: PropTypes.func.isRequired
    }

    render() {
        const {buttonTextKey, onClick} = this.props;

        return <View style={{height: 60, position: 'absolute', bottom: 0, right: 35}}>
            <TouchableOpacity activeOpacity={0.5}
                              onPress={onClick}
                              style={{
                                  height: 40,
                                  width: 80,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: Colors.AccentColor,
                                  elevation: 2,
                              }}>
                <Text style={{
                    color: 'white',
                    alignSelf: 'center',
                    fontSize: Styles.normalTextSize
                }}>{this.I18n.t(buttonTextKey)}</Text>
            </TouchableOpacity>
        </View>;
    }
}

export default FloatingButton;
