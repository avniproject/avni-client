import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import {Button, Text} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from 'lodash';
import Colors from '../primitives/Colors';

class WizardButtons extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        previous: PropTypes.object,
        next: PropTypes.object,
        style: PropTypes.object,
        nextAndMore: PropTypes.object,
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
        const nextAndMore = this.getButtonProps(this.props.nextAndMore);
        return (<View style={{marginVertical: 30, }}>
            <View
                style={this.appendedStyle({justifyContent: 'space-between', flexDirection: 'row', marginBottom: 12})}>
                {nextAndMore.visible ?
                    <Button primary
                            style={{flex: 1, justifyContent: "center"}}
                            onPress={() => nextAndMore.func()}>
                        <Text>{nextAndMore.label}</Text></Button>
                    : null
                }
            </View>
            <View
                style={this.appendedStyle({justifyContent: 'space-between', flexDirection: 'row'})}>
                {previousButton.visible ?
                    <Button primary
                            style={{
                                flex: 0.5,
                                backgroundColor: Colors.SecondaryActionButtonColor,
                                justifyContent: "center"
                            }}
                            onPress={() => previousButton.func()}><Text style={{color: '#212121'}}>{previousButton.label}</Text></Button> :
                    <View style={{flex: 0.5}}/>}
                {nextButton.visible ?
                    <Button primary
                            style={{flex: 0.5, marginLeft: 8, justifyContent: "center"}}
                            onPress={() => nextButton.func()}><Text>{nextButton.label}</Text></Button> : <View style={{flex: 0.5}}/>}
            </View>
        </View>);
    }
}

export default WizardButtons;