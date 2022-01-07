import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button, Text} from "native-base";
import PropTypes from "prop-types";
import {View} from 'react-native';

class SummaryButton extends AbstractComponent {
    static propTypes = {
        onPress: PropTypes.func.isRequired,
        styles: PropTypes.object,
    };

    render() {
        return (
            <View style={[{flex:1, marginTop: 5, justifyContent: 'flex-end', alignItems: 'flex-end'}, this.props.styles]}>
                <Button primary
                        style={{flex: 1, paddingHorizontal: 8, alignSelf: 'flex-end'}}
                        onPress={this.props.onPress}>
                    <Text>{this.I18n.t('goToSummary')}</Text>
                </Button>
            </View>
        )
    }
}

export default SummaryButton;
