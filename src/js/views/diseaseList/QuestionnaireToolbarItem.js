import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import {Global} from "../primitives/GlobalStyles";
import {TouchableHighlight, View, Text} from 'react-native';

class QuestionnaireToolbarItem extends AbstractComponent {
    render() {
        return (
            <TouchableHighlight onPress={this.props.handlePress}
                                style={this.props.style}>
                <View style={Global.actionButtonWrapper}>
                    {this.renderComponent(this.props.loading, (
                        <Text style={Global.actionButton}>{this.props.buttonText}</Text>))}
                </View>
            </TouchableHighlight>);
    }

}

export default QuestionnaireToolbarItem;