import React, {Component} from 'react';
import {View, Text, StyleSheet, TouchableNativeFeedback} from 'react-native';
import {Badge} from 'native-base';
import Fonts from '../primitives/Fonts';
import AbstractComponent from "../../framework/view/AbstractComponent";
import DGS from "../primitives/DynamicGlobalStyles";
import Separator from "../primitives/Separator";
import CHSNavigator from "../../utility/CHSNavigator";
import _ from "lodash";
import Colors from "../primitives/Colors"

class IndividualDetails extends AbstractComponent {
    static propTypes = {
        address: React.PropTypes.object,
        backFunction: React.PropTypes.func.isRequired
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
        const individualDetail1 = this.props.individual.detail1(this.I18n);
        const individualDetail2 = this.props.individual.detail2(this.I18n);
        const badges = this.props.individual.nonVoidedEnrolments().map(({program}, idx) =>
            <Badge key={idx} style={{backgroundColor: program.colour}}>{this.I18n.t(program.displayName)}</Badge>);
        const visitBadges = !_.isEmpty(this.props.visitInfo) ? _.head(this.props.visitInfo).visitName.map((visitName, idx) =>
                <Badge key={idx} style={{backgroundColor: Colors.DarkPrimaryColor, marginTop: 2}}>{visitName}</Badge>) :
            <View/>;
        return (
            <TouchableNativeFeedback
                onPress={() => CHSNavigator.navigateToProgramEnrolmentDashboardView(this, this.props.individual.uuid, "", false, this.props.backFunction)}
                background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={IndividualDetails.styles.container}>
                    <View style={IndividualDetails.styles.nameContainer}>
                        <View style={{flex: 1}}>
                            <Text style={[Fonts.typography("paperFontTitle"), IndividualDetails.styles.name]}>
                                {this.props.individual.nameString}
                            </Text>
                        </View>
                        <View style={IndividualDetails.styles.badgeList}>
                            {badges}
                        </View>
                    </View>
                    <Separator style={{alignSelf: 'stretch'}} height={2}/>
                    <View style={IndividualDetails.styles.attributesContainer}>
                        {!_.isEmpty(individualDetail1) ? this.renderAttribute(individualDetail1.label, individualDetail1.value) :
                            <View/>}
                        {!_.isEmpty(individualDetail2) ? this.renderAttribute(individualDetail2.label, individualDetail2.value) :
                            <View/>}
                    </View>
                    <View style={IndividualDetails.styles.visitBadgeList}>
                        {visitBadges}
                    </View>
                </View>
            </TouchableNativeFeedback>
        );
    }
}

export default IndividualDetails;
