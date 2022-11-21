import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button, Text, Icon} from "native-base";
import PropTypes from "prop-types";
import {View} from 'react-native';
import Colors from "../primitives/Colors";
import OrganisationConfigService from "../../service/OrganisationConfigService";
import {firebaseEvents, logEvent} from "../../utility/Analytics";
import AvniIcon from "./AvniIcon";

class SummaryButton extends AbstractComponent {
    static propTypes = {
        onPress: PropTypes.func.isRequired,
        styles: PropTypes.object,
    };

    onSummaryPress() {
        logEvent(firebaseEvents.SUMMARY_PRESSED);
        this.props.onPress();
    }

    render() {
        const showButton = this.getService(OrganisationConfigService).isSummaryButtonSetup();
        return (
            showButton ? <View style={[{
                flex: 1,
                flexDirection: "column",
                marginTop: 5,
                justifyContent: 'flex-end',
                alignItems: 'flex-end'
            }, this.props.styles]}>
                <Button primary
                        style={{
                            flexDirection: "row",
                            paddingHorizontal: 0,
                            alignSelf: 'flex-end',
                            backgroundColor: Colors.SecondaryActionButtonColor
                        }}
                        onPress={() => this.onSummaryPress()}
                        rightIcon={<AvniIcon style={{color: '#212121'}} name='fastforward' type='AntDesign' />}>
                    <Text style={{color: '#212121'}}>{this.I18n.t('goToSummary')}</Text>
                </Button>
            </View> : null
        )
    }
}

export default SummaryButton;
