import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {View, Text, StyleSheet, TouchableNativeFeedback} from 'react-native';
import {Badge} from 'native-base';
import Fonts from '../primitives/Fonts';
import AbstractComponent from "../../framework/view/AbstractComponent";
import DGS from "../primitives/DynamicGlobalStyles";
import Separator from "../primitives/Separator";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import CHSNavigator from "../../utility/CHSNavigator";


class IndividualDetails extends AbstractComponent {
    static propTypes = {
        address: PropTypes.object,
    };

    static styles = StyleSheet.create({
        container: {
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            flexWrap: 'nowrap',
            marginBottom: DGS.resizeHeight(16),
            paddingTop: DGS.resizeHeight(20),
            paddingBottom: DGS.resizeHeight(16),
            paddingLeft: DGS.resizeWidth((600 / 360) * 16),
            paddingRight: DGS.resizeWidth((600 / 360) * 16),
            backgroundColor: 'white',
            elevation: 2
        },
        badgeList: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexWrap: 'nowrap'
        },
        nameContainer: {
            flexDirection: 'row',
            justifyContent: "space-between",
            alignItems: "stretch",
            flexWrap: "nowrap",
            marginBottom: DGS.resizeHeight(8),
        },
        attributeContainer: {
            flexDirection: 'row',
            justifyContent: "flex-start",
            alignItems: "stretch",
            flexWrap: "nowrap",
        },
        name: {
            color: "rgba(0, 0, 0, 0.87)",
        },
        attributesContainer: {
            marginTop: DGS.resizeHeight(8),
        }
    });

    renderAttribute(key, value) {
        return (
            <View key={key} style={IndividualDetails.styles.attributeContainer}>
                <Text style={[Fonts.typography("paperFontSubhead"), {color: "rgba(0, 0, 0, 0.54)"}]}>
                    {`${key} : `}
                </Text>
                <Text style={[Fonts.typography("paperFontSubhead"), {color: "rgba(0, 0, 0, 0.87)"}]}>
                    {value}
                </Text>
            </View>
        );
    }

    render() {
        const badges = this.props.individual.enrolments.map(({program}, idx) =>
            <Badge key={idx} style={{backgroundColor: program.color}}>{program.name}</Badge>);
        return (
            <TouchableNativeFeedback
                onPress={() => CHSNavigator.navigateToProgramEnrolmentDashboardView(this, this.props.individual.uuid)}
                background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={IndividualDetails.styles.container}>
                    <View style={IndividualDetails.styles.nameContainer}>
                        <View style={{flex: 1}}>
                            <Text style={[Fonts.typography("paperFontTitle"), IndividualDetails.styles.name]}>
                                {this.props.individual.name}
                            </Text>
                        </View>
                        <View style={IndividualDetails.styles.badgeList}>
                            {badges}
                        </View>
                    </View>
                    <Separator style={{alignSelf: 'stretch'}} height={2}/>
                    <View style={IndividualDetails.styles.attributesContainer}>
                        {this.renderAttribute("Age", this.props.individual.getDisplayAge())}
                        {this.renderAttribute("Gender", this.props.individual.gender.name)}
                    </View>
                </View>
            </TouchableNativeFeedback>
        );
    }
}

export default IndividualDetails;