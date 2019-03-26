import {View} from "react-native";
import React from "react";
import {Button} from "native-base";
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
        style: React.PropTypes.object,
        nextAndMore: React.PropTypes.object,
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
                            style={{flex: 1}}
                            onPress={() => nextAndMore.func()}>
                        {nextAndMore.label}</Button>
                    : null
                }
            </View>
            <View
                style={this.appendedStyle({justifyContent: 'space-between', flexDirection: 'row'})}>
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
        </View>);
    }
}

export default WizardButtons;