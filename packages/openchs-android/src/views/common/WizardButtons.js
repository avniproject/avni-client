import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import {Button, Icon, Text} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from 'lodash';
import Colors from '../primitives/Colors';
import Distances from "../primitives/Distances";

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
                            style={{flex: 1, justifyContent: "center"}}
                            onPress={() => nextAndMore.func()}>
                        <Text style={{textAlign: 'center'}}>{nextAndMore.label}</Text></Button>
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
                            onPress={() => previousButton.func()}
                            iconLeft={true}>
                        <Icon style={{color: '#212121'}} name='stepbackward' type='AntDesign' />
                        <Text style={{color: '#212121'}}>{previousButton.label}</Text>
                    </Button> :
                    <View style={{flex: 0.5}}/>}
                {nextButton.visible ?
                    <Button primary
                            style={{flex: 0.5, marginLeft: 8, justifyContent: "center"}}
                            onPress={() => nextButton.func()}
                            iconRight={true}>
                        <Text>{nextButton.label}</Text>
                        <Icon name='stepforward' type='AntDesign' />
                    </Button> : <View style={{flex: 0.5}}/>}
            </View>
        </View>);
    }
}

export default WizardButtons;
