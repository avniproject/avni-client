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
import Styles from "../primitives/Styles";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Distances from "../primitives/Distances";
import moment from "moment";


class IndividualDetails extends AbstractComponent {
    static propTypes = {
        individualWithMetadata: PropTypes.object,
        backFunction: PropTypes.func.isRequired
    };
    static containerBackgroundColor = 'white';
    static styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: IndividualDetails.containerBackgroundColor,
            flexDirection: 'column',
            alignSelf: 'flex-start'
        },
        nameContainer: {
            paddingVertical: 4,
            padding: Distances.ScaledContentDistanceFromEdge,
            flexDirection: 'row',
            justifyContent: "flex-start",
            backgroundColor: IndividualDetails.containerBackgroundColor,
        },
        attributeContainer: {
            paddingVertical: 4,
            padding: Distances.ScaledContentDistanceFromEdge,
            flexDirection: 'row',
            justifyContent: "flex-start",
            alignItems: "stretch",
            flexWrap: "nowrap",
            backgroundColor: IndividualDetails.containerBackgroundColor,
        },
        attributesContainer: {
            marginTop: DGS.resizeHeight(8),
        },
        individualContainerTextColor: {
            color: 'black'
        }
    });

    renderAttribute(attribute) {
        return (
            <Text key={attribute.key} style={IndividualDetails.styles.attributeContainer}>
                {!_.isEmpty(attribute) ?
                    <Text
                        style={[IndividualDetails.styles.individualContainerTextColor, Fonts.typography("paperFontSubhead")]}>
                        {attribute.value}
                    </Text> :
                    <View/>}
            </Text>
        );
    }

    renderVisits(type, color) {
        return type.map((info, i) => {
            const row = info.visit.map((item, index) => (<Text
                style={[Fonts.typography("paperFontSubhead"), {
                    color: color
                }]}>{(index ? ', ' : '') + item}</Text>));
            return <TouchableNativeFeedback onPress={() => this.proceed(info.encounter)}
                                            background={TouchableNativeFeedback.SelectableBackground()}>
                <View key={i}>
                    <View style={styles.container}>
                        <View style={[styles.strip, {backgroundColor: info.color}]}/>
                        <Text style={styles.textContainer}>
                            {row}
                        </Text>
                        <Icon style={[{color: info.color}, styles.iconStyle]} name='chevron-right'/>
                    </View>
                </View>
            </TouchableNativeFeedback>;
        });
    }

    proceed(encounter) {
        let programEncounter = encounter.cloneForEdit();
        programEncounter.encounterDateTime = moment().toDate();
        CHSNavigator.navigateToProgramEncounterView(this, programEncounter);
    }

    render() {
        const individualAge = this.props.individualWithMetadata.individual.detail1(this.I18n);
        const individualGender = this.props.individualWithMetadata.individual.detail2(this.I18n);
        const individualAddress = this.props.individualWithMetadata.individual.address(this.I18n);
        const sameDateVisits = _.map(this.props.individualWithMetadata.visitInfo.visitName.filter((info) => _.includes(info.visit, this.props.header)), (info) => {
            return {visit: info.visit.slice(0, -1), encounter: info.encounter, color: info.color};
        });
        const diffDateVisits = _.map(this.props.individualWithMetadata.visitInfo.visitName.filter((info) => !_.includes(info.visit, this.props.header)), (info) => {
            return {visit: info.visit, encounter: info.encounter, color: info.color};
        });

        return (
            <View style={{
                margin: 4,
                elevation: 3,
                minHeight: 48,
                marginVertical: 8,
                backgroundColor: IndividualDetails.containerBackgroundColor,
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: 10,
            }}>
                <View style={{
                    marginVertical: 7,
                    marginRight: 3.5,
                    marginLeft: 3.5,
                    flexDirection: 'column',
                    alignItems: 'center',
                }}>
                    <TouchableNativeFeedback
                        onPress={() => CHSNavigator.navigateToProgramEnrolmentDashboardView(this, this.props.individualWithMetadata.individual.uuid, "", false, this.props.backFunction)}
                        background={TouchableNativeFeedback.SelectableBackground()}>
                        <View style={{
                            flexDirection: 'row',
                            backgroundColor: IndividualDetails.containerBackgroundColor,
                        }}>
                            <View style={IndividualDetails.styles.container}>
                                <Text style={IndividualDetails.styles.nameContainer}>
                                    <Text
                                        style={[Fonts.typography("paperFontSubhead"), {fontWeight: 'bold'}, IndividualDetails.styles.individualContainerTextColor]}>
                                        {this.props.individualWithMetadata.individual.nameString}
                                    </Text>
                                    <Text style={IndividualDetails.styles.individualContainerTextColor}>{', '}</Text>
                                    {this.renderAttribute(individualAge)}
                                    <Text style={IndividualDetails.styles.individualContainerTextColor}>{', '}</Text>
                                    {this.renderAttribute(individualGender)}
                                </Text>
                                {this.renderAttribute(individualAddress)}
                            </View>
                        </View>
                    </TouchableNativeFeedback>
                    {this.renderVisits(sameDateVisits, "rgba(0, 0, 0, 0.87)")}
                    {this.renderVisits(diffDateVisits, Styles.greyText)}
                </View>
            </View>
        );
    }
}

export default IndividualDetails;

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fefefe',
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: "#00000012",
    },
    textContainer: {
        flex: 1,
        paddingVertical: 4,
        padding: Distances.ScaledContentDistanceFromEdge,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    encounterStyle: {
        color: Colors.DefaultPrimaryColor,
        fontWeight: 'normal',
        fontSize: 13,
        alignSelf: 'flex-start',
        textAlignVertical: 'center',
    },
    dateStyle: {
        color: Styles.greyText,
        fontWeight: 'normal',
        fontSize: 13,
        alignSelf: 'flex-end',
        marginLeft: 'auto',
        textAlignVertical: 'center',
    },
    headerStyle: {
        color: "rgba(0, 0, 0, 0.87)",
        fontWeight: 'normal',
        fontSize: 15,
        paddingTop: 15
    },
    iconStyle: {
        opacity: 0.8,
        alignSelf: 'center',
        fontSize: 40
    },
    strip: {
        width: 8,
        height: '100%'
    },
});
