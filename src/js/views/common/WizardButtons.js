import {StyleSheet, Text, View, TouchableHighlight, Navigator, Alert} from 'react-native';
import React, {Component} from 'react';
import * as CHSStyles from "../primitives/GlobalStyles";
import MessageService from '../../service/MessageService';

class WizardButtons extends Component {

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    static contextTypes = {
        getService: React.PropTypes.func.isRequired
    };

    static propTypes = {
        buttons: React.PropTypes.array.isRequired,
    };

    render() {
        const buttons = this.props.buttons.map((button, idx)=>(
            <TouchableHighlight key={idx}>
                <View style={CHSStyles.Global.actionButtonWrapper}>
                    <Text onPress={button.func}
                          style={[CHSStyles.Global.actionButton, button.visible ? CHSStyles.Global.navButtonVisible : CHSStyles.Global.navButtonHidden]}>{this.I18n.t(button.text)}</Text>
                </View>
            </TouchableHighlight>
        ));
        return (
            <View
                style={{
                    flexDirection: 'row',
                    height: 50,
                    justifyContent: 'space-between',
                    marginTop: 30
                }}>
                {buttons}
            </View>
        );
    }
}

export default WizardButtons;