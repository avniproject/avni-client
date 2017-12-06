import {View} from "react-native";
import React, {Component} from "react";
import {
    Button

} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from 'lodash';
import Colors from '../primitives/Colors';

class WizardButtons extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        previous: React.PropTypes.object,
        next: React.PropTypes.object,
        style: React.PropTypes.object
    };

    getButtonProps(buttonProps) {
        let returnProps = buttonProps;
        if (_.isNil(returnProps)) returnProps = {visible: false};
        if (!_.isNil(returnProps.label) && _.isNil(returnProps.visible)) returnProps.visible = true;
        if (_.isNil(returnProps.func)) returnProps.func = () => {
        };
        return returnProps;
    }

    render() {
        const previousButton = this.getButtonProps(this.props.previous);
        const nextButton = this.getButtonProps(this.props.next);
        return (
            <View
                style={this.appendedStyle({marginVertical: 30, justifyContent: 'space-between', flexDirection: 'row'})}>
                {previousButton.visible ?
                    <Button primary
                            style={{
                                flex: 0.5,
                                backgroundColor: Colors.SecondaryActionButtonColor
                            }}
                            textStyle={{color: '#212121'}}
                            onPress={() => previousButton.func()}>{previousButton.label}</Button> :
                    <View style={{flex: 0.5}}/>}
                {nextButton.visible ?
                    <Button primary
                            style={{flex: 0.5, marginLeft: 8}}
                            onPress={() => nextButton.func()}>{nextButton.label}</Button> : <View style={{flex: 0.5}}/>}
            </View>
        );
    }
}

export default WizardButtons;