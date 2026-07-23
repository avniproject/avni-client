import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import {Button} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from 'lodash';
import Colors from '../primitives/Colors';
import Distances from "../primitives/Distances";

const BUTTON_RADIUS = 16;

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
        return (<View style={{marginVertical: 30, paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
            <View
                style={this.appendedStyle({justifyContent: 'space-between', flexDirection: 'row', marginBottom: 12})}>
                {nextAndMore.visible ?
                    <Button primary
                            style={{flex: 1, justifyContent: "center", backgroundColor: Colors.BrandPrimaryDark, borderRadius: BUTTON_RADIUS}}
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
                                justifyContent: "center",
                                backgroundColor: '#ffffff',
                                borderRadius: BUTTON_RADIUS,
                                borderWidth: 1,
                                borderColor: Colors.BorderDefault
                            }}
                            _text={{color: Colors.BrandPrimary}}
                            onPress={() => previousButton.func()}>
                        {previousButton.label}</Button> :
                    <View style={{flex: 0.5}}/>}
                {nextButton.visible ?
                    <Button primary
                            style={{flex: 0.5, marginLeft: 8, justifyContent: "center", backgroundColor: Colors.BrandPrimaryDark, borderRadius: BUTTON_RADIUS}}
                            onPress={() => nextButton.func()}>{nextButton.label}
                    </Button> : <View style={{flex: 0.5}}/>}
            </View>
        </View>);
    }
}

export default WizardButtons;
