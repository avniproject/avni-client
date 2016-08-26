import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import {Global} from "../primitives/GlobalStyles";
import {TouchableHighlight, View, Text} from 'react-native';
import MessageService from '../../service/MessageService';

class QuestionnaireToolbarItem extends AbstractComponent {
    static contextTypes = {
        getService: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    render() {
        return (
            <TouchableHighlight onPress={this.props.handlePress}
                                style={this.props.style}>
                <View style={Global.actionButtonWrapper}>
                    {this.renderComponent(this.props.loading, (
                        <Text style={Global.actionButton}>{this.I18n.t(this.props.buttonText)}</Text>))}
                </View>
            </TouchableHighlight>);
    }

}

export default QuestionnaireToolbarItem;