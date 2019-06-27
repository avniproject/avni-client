// @flow
import PropTypes from "prop-types";
import React from "react";
import {Text, TouchableNativeFeedback, View, ToastAndroid, SectionList, StyleSheet} from "react-native";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import {StartProgramActionsNames as Actions} from "../../action/program/StartProgramActions";
import PresetOptionItem from "../primitives/PresetOptionItem";
import Reducers from "../../reducer/index";
import Styles from "../primitives/Styles";
import CHSNavigator from "../../utility/CHSNavigator";
import moment from "moment";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import themes from "../primitives/themes";
import Distances from "../primitives/Distances";
import General from "../../utility/General";
import _ from "lodash";
import {ProgramEncounter} from "openchs-models";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

@Path("/StartProgramView")
class StartProgramView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.startProgramActions);
    }

    viewName() {
        return "StartProgramView";
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props.params);
        return super.componentWillMount();
    }

    encounterFromEncounterType(encounterType) {
        const programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.programEnrolment = this.state.enrolment;
        programEncounter.encounterDateTime = moment().toDate();
        programEncounter.encounterType = encounterType;
        return programEncounter;
    }

    proceed(encounter) {
        const selectedEncounter = _.has(encounter, "operationalEncounterTypeName")
            ? this.encounterFromEncounterType(encounter)
            : encounter;
        let programEncounter = selectedEncounter.cloneForEdit();
        programEncounter.encounterDateTime = moment().toDate();
        CHSNavigator.navigateToProgramEncounterView(this, programEncounter);
    }

    renderHeader(title) {
        return <Text style={[Fonts.typography("paperFontTitle"), styles.headerStyle]}>{title}</Text>;
    }

    renderItem(encounter) {
        const encounterName = this.I18n.t(encounter.name || encounter.encounterType.name);
        const displayDate =
            (encounter.earliestVisitDateTime && General.toDisplayDate(encounter.earliestVisitDateTime)) || "";
        const color = moment().isAfter(encounter.maxVisitDateTime)
            ? "#d0011b"
            : moment().isBetween(encounter.earliestVisitDateTime, encounter.maxVisitDateTime)
            ? Colors.AccentColor
            : "gold";
        return (
            <TouchableNativeFeedback
                onPress={() => {
                    this.proceed(encounter);
                }}
                background={TouchableNativeFeedback.SelectableBackground()}
            >
                <View style={styles.container}>
                    <View style={[styles.strip, !_.isEmpty(displayDate) && {backgroundColor: color}]} />
                    <View style={styles.textContainer}>
                        <Text style={[Fonts.typography("paperFontSubhead"), styles.encounterStyle]}>
                            {encounterName}
                        </Text>
                        {!_.isEmpty(displayDate) ? (
                            <Text style={[Fonts.typography("paperFontSubhead"), styles.dateStyle]}>{displayDate}</Text>
                        ) : (
                            <View style={{marginLeft: "auto"}} />
                        )}
                    </View>
                    <Icon style={[styles.iconStyle, !_.isEmpty(displayDate) && {color: color}]} name="chevron-right" />
                </View>
            </TouchableNativeFeedback>
        );
    }

    render() {
        General.logDebug(this.viewName(), "render");
        const types: string[] = !this.state.hideUnplanned
            ? !_.isEmpty(this.state.encounters)
                ? [this.I18n.t("plannedVisits"), this.I18n.t("unplannedVisits")]
                : [this.I18n.t("unplannedVisits")]
            : [this.I18n.t("plannedVisits")];
        const visits = !this.state.hideUnplanned
            ? !_.isEmpty(this.state.encounters)
                ? [this.state.encounters, this.state.encounterTypes]
                : [this.state.encounterTypes]
            : [this.state.encounters];
        const data = _.zip(types, visits).map(([t, v]) => ({title: t, data: v}));

        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t("chooseVisit")} />
                    <View>
                        <SectionList
                            contentContainerStyle={{
                                marginRight: Distances.ScaledContentDistanceFromEdge,
                                marginLeft: Distances.ScaledContentDistanceFromEdge,
                                marginTop: Distances.ScaledContentDistanceFromEdge
                            }}
                            sections={data}
                            renderSectionHeader={({section: {title}}) => this.renderHeader(title)}
                            renderItem={data => this.renderItem(data.item.data)}
                            keyExtractor={(item, index) => index}
                        />
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default StartProgramView;

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
