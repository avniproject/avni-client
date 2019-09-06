// @flow
import PropTypes from "prop-types";
import React from "react";
import {SectionList, StyleSheet, Text, ToastAndroid, TouchableNativeFeedback, View} from "react-native";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {StartProgramActions as Actions} from "../../action/program/StartProgramActions";
import Reducers from "../../reducer/index";
import Styles from "../primitives/Styles";
import CHSNavigator from "../../utility/CHSNavigator";
import moment from "moment";
import Distances from "../primitives/Distances";
import General from "../../utility/General";
import _ from "lodash";
import {Encounter, EncounterType, Individual, ProgramEncounter} from "openchs-models";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

class NewVisitMenuView extends AbstractComponent {
    static propTypes = {
        enrolmentUUID: PropTypes.string,
        individualUUID: PropTypes.string,
        onSaveCallback: PropTypes.func,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.startProgramActions);
    }

    componentWillMount() {
        this.dispatchAction(Actions.onLoad, this.props);
        return super.componentWillMount();
    }

    proceed(typeorencounter, parent) {
        const selectedEncounter = typeorencounter instanceof EncounterType
            ? parent instanceof Individual
                ? Encounter.createScheduled(typeorencounter, parent)
                : ProgramEncounter.createScheduled(typeorencounter, parent)
            : typeorencounter;
        const encounter = selectedEncounter.cloneForEdit();
        encounter.encounterDateTime = moment().toDate();
        CHSNavigator.navigateToEncounterView(this, {
            encounter,
            onSaveCallback: this.props.onSaveCallback,
        });
    }

    static Header = ({section: {title, data}}) => {
        return !_.isEmpty(data) &&
            <Text style={[Fonts.typography("paperFontTitle"), styles.headerStyle]}>{title}</Text>;
    };

    static Item = ({name, displayDate, statusColor, onSelect}) => {
        return (
            <TouchableNativeFeedback
                onPress={onSelect}
                background={TouchableNativeFeedback.SelectableBackground()}
            >
                <View style={styles.container}>
                    <View style={[styles.strip, !_.isEmpty(displayDate) && {backgroundColor: statusColor}]}/>
                    <View style={styles.textContainer}>
                        <Text style={[Fonts.typography("paperFontSubhead"), styles.encounterStyle]}>
                            {name}
                        </Text>
                        {!_.isEmpty(displayDate) ? (
                            <Text style={[Fonts.typography("paperFontSubhead"), styles.dateStyle]}>{displayDate}</Text>
                        ) : (
                            <View style={{marginLeft: "auto"}}/>
                        )}
                    </View>
                    <Icon style={[styles.iconStyle, !_.isEmpty(displayDate) && {color: statusColor}]}
                          name="chevron-right"/>
                </View>
            </TouchableNativeFeedback>
        );
    };

    renderEncounter = ({item: {encounter, parent}}) => {
        const encounterName = this.I18n.t(encounter.name);
        const displayDate = General.toDisplayDate(encounter.earliestVisitDateTime);
        const color = moment().isAfter(encounter.maxVisitDateTime)
            ? Colors.OverdueVisitColor
            : moment().isBetween(encounter.earliestVisitDateTime, encounter.maxVisitDateTime)
                ? Colors.ScheduledVisitColor
                : Colors.FutureVisitColor;
        return <NewVisitMenuView.Item name={encounterName}
                                      displayDate={displayDate}
                                      statusColor={color}
                                      onSelect={() => this.proceed(encounter, parent)}/>;
    };

    renderEncounterType = ({item: {encounterType, parent}}) => {
        const encounterName = this.I18n.t(encounterType.operationalEncounterTypeName);
        return <NewVisitMenuView.Item name={encounterName}
                                      displayDate=''
                                      statusColor={Colors.FutureVisitColor}
                                      onSelect={() => this.proceed(encounterType, parent)}/>;
    };

    render() {
        General.logDebug(this.viewName(), "render");
        const encounters = this.state.encounters;
        const encounterTypes = this.state.encounterTypes;
        const sections = [
            {title: this.I18n.t("plannedVisits"), data: encounters, renderItem: this.renderEncounter},
        ];
        if (!this.state.hideUnplanned) {
            sections.push(
                {title: this.I18n.t("unplannedVisits"), data: encounterTypes, renderItem: this.renderEncounterType});
        }

        return (
            <SectionList
                contentContainerStyle={{
                    marginRight: Distances.ScaledContentDistanceFromEdge,
                    marginLeft: Distances.ScaledContentDistanceFromEdge,
                    marginTop: Distances.ScaledContentDistanceFromEdge
                }}
                sections={sections}
                renderSectionHeader={NewVisitMenuView.Header}
                keyExtractor={(item, index) => index}
            />
        );
    }
}

export default NewVisitMenuView;

const styles = StyleSheet.create({
    container: {
        margin: 4,
        elevation: 2,
        minHeight: 48,
        marginVertical: 8,
        backgroundColor: Colors.cardBackgroundColor,
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center"
    },
    strip: {
        width: 8,
        height: "100%",
        backgroundColor: Colors.GreyBackground
    },
    textContainer: {
        flex: 1,
        paddingVertical: 4,
        padding: Distances.ScaledContentDistanceFromEdge,
        flexDirection: "row",
        flexWrap: "wrap"
    },
    encounterStyle: {
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
        color: Colors.GreyBackground,
        opacity: 0.8,
        alignSelf: "center",
        fontSize: 40
    }
});
