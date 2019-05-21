import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {View, StyleSheet, TouchableNativeFeedback} from 'react-native';
import {Badge, Text} from 'native-base';
import Fonts from '../primitives/Fonts';
import AbstractComponent from "../../framework/view/AbstractComponent";
import DGS from "../primitives/DynamicGlobalStyles";
import Separator from "../primitives/Separator";
import CHSNavigator from "../../utility/CHSNavigator";
import _ from "lodash";
import Colors from "../primitives/Colors"

class IndividualDetails extends AbstractComponent {
    static propTypes = {
        individualWithMetadata: PropTypes.object,
        backFunction: PropTypes.func.isRequired
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
        visitBadgeList: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
        },
        nameContainer: {
            flexDirection: 'row',
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "nowrap",
            marginBottom: DGS.resizeHeight(8),
        },
        visitsContainer: {
            flexDirection: 'row',
            justifyContent:'flex-start',
            alignItems: "center",
            flexWrap: "wrap",
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

    renderAttribute(attribute) {
        return (
            <View key={attribute.key} style={IndividualDetails.styles.attributeContainer}>
                {!_.isEmpty(attribute) ?
                    <Text style={[Fonts.typography("paperFontSubhead"), {color: "rgba(0, 0, 0, 0.87)"}]}>
                        {attribute.value}
                    </Text> :
                    <View/>}
            </View>
        );
    }

    render() {
        const individualAge = this.props.individualWithMetadata.individual.detail1(this.I18n);
        const individualGender = this.props.individualWithMetadata.individual.detail2(this.I18n);
        const individualAddress = this.props.individualWithMetadata.individual.address(this.I18n);

        const visits = this.props.individualWithMetadata.visitInfo.visitName.map((visit) =>
                <Text style={[Fonts.typography("paperFontSubhead"), {color: "rgba(0, 0, 0, 0.87)"}]}>{visit}</Text>
        );

        return (
            <TouchableNativeFeedback
                onPress={() => CHSNavigator.navigateToProgramEnrolmentDashboardView(this, this.props.individualWithMetadata.individual.uuid, "", false, this.props.backFunction)}
                background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={IndividualDetails.styles.container}>
                    <View style={IndividualDetails.styles.nameContainer}>
                        <Text
                            style={[Fonts.typography("paperFontSubhead"), IndividualDetails.styles.name, {fontWeight: 'bold'}]}>
                            {this.props.individualWithMetadata.individual.nameString}
                        </Text>
                        <Text>{', '}</Text>
                        {this.renderAttribute(individualAge)}
                        <Text>{', '}</Text>
                        {this.renderAttribute(individualGender)}
                    </View>
                    {this.renderAttribute(individualAddress)}
                    <Separator style={{alignSelf: 'stretch'}} height={2}/>
                    <View style={IndividualDetails.styles.visitsContainer}>
                        {visits}
                    </View>
                </View>
            </TouchableNativeFeedback>
        );
    }
}

export default IndividualDetails;
