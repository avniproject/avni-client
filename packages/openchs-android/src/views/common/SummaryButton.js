import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button, Text, Icon} from "native-base";
import PropTypes from "prop-types";
import {View} from 'react-native';
import Colors from "../primitives/Colors";
import OrganisationConfigService from "../../service/OrganisationConfigService";
import {firebaseEvents, logEvent} from "../../utility/Analytics";

class SummaryButton extends AbstractComponent {
    static propTypes = {
        onPress: PropTypes.func.isRequired,
        styles: PropTypes.object,
    };

    onSummaryPress() {
        logEvent(firebaseEvents.SUMMARY_PRESSED);
        this.props.onPress
    }

    render() {
        const showButton = this.getService(OrganisationConfigService).isSummaryButtonSetup();
        return (
            showButton ? <View style={[{
                flex: 1,
                marginTop: 5,
                justifyContent: 'flex-end',
                alignItems: 'flex-end'
            }, this.props.styles]}>
                <Button primary
                        style={{
                            flex: 1,
                            paddingHorizontal: 8,
                            alignSelf: 'flex-end',
                            backgroundColor: Colors.SecondaryActionButtonColor
                        }}
                        onPress={() => this.onSummaryPress()}
                        iconRight={true}>
                    <Text style={{color: '#212121'}}>{this.I18n.t('goToSummary')}</Text>
                    <Icon style={{color: '#212121'}} name='fastforward' type='AntDesign' />
                </Button>
            </View> : null
        )
    }
}

export default SummaryButton;
