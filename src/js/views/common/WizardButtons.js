import {StyleSheet, Text, View, TouchableHighlight, Navigator, Alert} from 'react-native';
import React, {Component} from 'react';
import GlobalStyles from "../primitives/GlobalStyles";
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
            <TouchableHighlight key={idx}
                                style={button.visible ? GlobalStyles.navButtonVisible : GlobalStyles.navButtonHidden}>
                <View style={GlobalStyles.actionButtonWrapper}>
                    <Text onPress={button.func}
                          style={[GlobalStyles.actionButton]}>{this.I18n.t(button.text)}</Text>
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