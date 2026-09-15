import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import {Button} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from 'lodash';
import Colors from '../primitives/Colors';
import Distances from "../primitives/Distances";

const BUTTON_RADIUS = 8;

class WizardButtons extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        previous: PropTypes.object,
        next: PropTypes.object,
        style: PropTypes.object,
        nextAndMore: PropTypes.object,
        containerStyle: PropTypes.object,
        buttonHeight: PropTypes.number,
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
        const containerStyle = this.props.containerStyle || {marginVertical: 30, paddingHorizontal: Distances.ScaledContentDistanceFromEdge};
        const buttonHeightStyle = _.isNil(this.props.buttonHeight) ? {} : {height: this.props.buttonHeight};
        return (<View style={containerStyle}>
            {nextAndMore.visible &&
            <View
                style={this.appendedStyle({justifyContent: 'space-between', flexDirection: 'row', marginBottom: 12})}>
                <Button primary
                        style={{flex: 1, justifyContent: "center", backgroundColor: Colors.BrandPrimaryDark, borderRadius: BUTTON_RADIUS, ...buttonHeightStyle}}
                        onPress={() => nextAndMore.func()}>
                    {nextAndMore.label}</Button>
            </View>
            }
            <View
                style={this.appendedStyle({justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center'})}>
                {previousButton.visible ?
                    <Button primary
                            style={{
                                flex: 0.5,
                                justifyContent: "center",
                                backgroundColor: '#ffffff',
                                borderRadius: BUTTON_RADIUS,
                                borderWidth: 1,
                                borderColor: Colors.BorderDefault,
                                ...buttonHeightStyle
                            }}
                            _text={{color: Colors.BrandPrimary}}
                            onPress={() => previousButton.func()}>
                        {previousButton.label}</Button> :
                    <View style={{flex: 0.5}}/>}
                {nextButton.visible ?
                    <Button primary
                            style={{
                                flex: 0.5,
                                marginLeft: 8,
                                justifyContent: "center",
                                // Stays enabled either way - ready === false just shows the paler,
                                // not-yet-satisfied colour instead of the full brand colour.
                                backgroundColor: nextButton.ready === false ? '#DAF3F4' : Colors.BrandPrimaryDark,
                                borderRadius: BUTTON_RADIUS,
                                ...buttonHeightStyle
                            }}
                            _text={nextButton.ready === false ? {color: Colors.BrandPrimaryDark} : undefined}
                            onPress={() => nextButton.func()}>{nextButton.label}
                    </Button> : <View style={{flex: 0.5}}/>}
            </View>
        </View>);
    }
}

export default WizardButtons;
