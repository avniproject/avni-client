import PropTypes from "prop-types";
import React from "react";
import {StyleSheet, TouchableNativeFeedback, View} from "react-native";
import {Text} from "native-base";
import Fonts from "../primitives/Fonts";
import AbstractComponent from "../../framework/view/AbstractComponent";
import CHSNavigator from "../../utility/CHSNavigator";
import _ from "lodash";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Distances from "../primitives/Distances";
import moment from "moment";
import Separator from "../primitives/Separator";
import SubjectInfoCard from "../common/SubjectInfoCard";

class IndividualDetails extends AbstractComponent {
    static propTypes = {
        individualWithMetadata: PropTypes.object,
        backFunction: PropTypes.func.isRequired
    };

    renderVisits(type, color) {
        return type.map((info, i) => {
            const row = info.visit.map((item, index) => {
                return (
                    <Text
                        key={index}
                        style={[
                            Fonts.typography("paperFontSubhead"),
                            {
                                color: color
                            }
                        ]}
                    >
                        {(index ? ", " : "") + this.I18n.t(item)}
                    </Text>
                );
            });
            return (
                <TouchableNativeFeedback
                    onPress={() => this.proceed(info.encounter)}
                    key={i}
                    background={TouchableNativeFeedback.SelectableBackground()}
                >
                    <View key={i}>
                        <View style={styles.container}>
                            <View style={[styles.strip, {backgroundColor: info.color}]}/>
                            <Text style={styles.textContainer}>{row}</Text>
                            <Icon style={[{color: info.color}, styles.iconStyle]} name="chevron-right"/>
                        </View>
                    </View>
                </TouchableNativeFeedback>
            );
        });
    }

    proceed(encounter) {
        encounter = encounter.cloneForEdit();
        encounter.encounterDateTime = moment().toDate();
        CHSNavigator.navigateToEncounterView(this, {
            encounter,
            backFunction: this.props.backFunction
        });
    }

    render() {
        const isScheduledOrOverdueView = _.includes(['scheduled', 'overdue', 'Scheduled visits', 'Overdue visits'], this.props.cardType);
        const cardSpacing = isScheduledOrOverdueView ? 20 : 1;
        const backgroundColor = isScheduledOrOverdueView ? Colors.GreyContentBackground : Colors.InputBorderNormal;
        const hideEnrolments = isScheduledOrOverdueView;
        const sameDateVisits = _.map(
            this.props.individualWithMetadata.visitInfo.visitName.filter(info =>
                _.includes(info.visit, this.props.header)
            ),
            info => {
                return {visit: info.visit.slice(0, -1), encounter: info.encounter, color: info.color};
            }
        );
        const diffDateVisits = _.map(
            this.props.individualWithMetadata.visitInfo.visitName.filter(
                info => !_.includes(info.visit, this.props.header)
            ),
            info => {
                return {visit: info.visit, encounter: info.encounter, color: info.color};
            }
        );

        return (
            <View style={{
                marginRight: Distances.ScaledContentDistanceFromEdge,
                marginLeft: Distances.ScaledContentDistanceFromEdge
            }}
            >
                <TouchableNativeFeedback
                    onPress={() =>
                        CHSNavigator.navigateToProgramEnrolmentDashboardView(
                            this,
                            this.props.individualWithMetadata.individual.uuid,
                            "",
                            false,
                            this.props.backFunction
                        )
                    }
                    background={TouchableNativeFeedback.SelectableBackground()}
                >
                    <View>
                        <SubjectInfoCard individual={this.props.individualWithMetadata.individual}
                                         hideEnrolments={hideEnrolments}/>
                    </View>
                </TouchableNativeFeedback>
                {this.renderVisits(sameDateVisits, "rgba(0, 0, 0, 0.87)")}
                {this.renderVisits(diffDateVisits, Styles.greyText)}
                <Separator height={cardSpacing} backgroundColor={backgroundColor}/>
            </View>
        );
    }
}

export default IndividualDetails;

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fefefe",
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        borderWidth: 1,
        borderColor: "#00000012"
    },
    textContainer: {
        flex: 1,
        paddingVertical: 8,
        padding: Distances.ScaledContentDistanceFromEdge,
        flexDirection: "row",
        flexWrap: "wrap"
    },
    programNameStyle: {
        color: Colors.DefaultPrimaryColor,
        fontWeight: "normal",
        fontSize: 13,
        alignSelf: "flex-start",
        textAlignVertical: "center"
    },
    dateStyle: {
        color: Styles.greyText,
        fontWeight: "normal",
        fontSize: 13,
        alignSelf: "flex-end",
        marginLeft: "auto",
        textAlignVertical: "center"
    },
    headerStyle: {
        color: "rgba(0, 0, 0, 0.87)",
        fontWeight: "normal",
        fontSize: 15,
        paddingTop: 15
    },
    iconStyle: {
        opacity: 0.8,
        alignSelf: "center",
        fontSize: 40
    },
    strip: {
        width: 8,
        height: "100%"
    }
});
