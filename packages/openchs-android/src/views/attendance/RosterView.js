import React from "react";
import {FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import moment from "moment";
import {AttendanceRecord} from "avni-models";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import ActionSelector from "../common/ActionSelector";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Reducers from "../../reducer";
import {RosterActions} from "../../action/attendance/RosterActions";
import RosterRow from "./RosterRow";

@Path("/attendanceRosterView")
class RosterView extends AbstractComponent {
    static propTypes = {
        groupSubject: PropTypes.object.isRequired,
        attendanceType: PropTypes.object.isRequired,
        scheduledDate: PropTypes.instanceOf(Date).isRequired,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.attendanceRoster);
        // Reason-picker modal target — ephemeral, not in redux.
        this._pickingFor = null;
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(RosterActions.Names.ON_LOAD, {
            groupSubject: this.props.groupSubject,
            attendanceType: this.props.attendanceType,
            scheduledDate: this.props.scheduledDate,
        });
        super.UNSAFE_componentWillMount();
    }

    _onToggle = (subjectUUID) => this.dispatchAction(RosterActions.Names.TOGGLE_PRESENCE, {subjectUUID});
    _onSetNotes = (notes) => this.dispatchAction(RosterActions.Names.SET_NOTES, {notes});
    _onMarkAllAbsent = () => this.dispatchAction(RosterActions.Names.MARK_ALL_ABSENT);
    _onSave = () => {
        // Phase 5 wires the atomic SessionService.saveOrUpdate path here.
    };

    _onPickReason = (subjectUUID) => {
        this._pickingFor = subjectUUID;
        this.setState({reasonPickerVisible: true});
    };

    _hideReasonPicker = () => {
        this._pickingFor = null;
        this.setState({reasonPickerVisible: false});
    };

    _reasonActions() {
        return (this.state.absenceReasonAnswers || []).map(a => ({
            label: a.name,
            fn: () => {
                this.dispatchAction(RosterActions.Names.SET_REASON, {
                    subjectUUID: this._pickingFor,
                    reasonConceptUUID: a.uuid,
                });
                this._hideReasonPicker();
            },
        }));
    }

    _summaryCounts() {
        const {roster, followUpEncounterTypeUuid} = this.state;
        let withReason = 0;
        let withoutReason = 0;
        (roster || []).forEach(r => {
            if (r.status !== AttendanceRecord.status.ABSENT) return;
            if (r.reasonConceptUUID) withReason += 1;
            else withoutReason += 1;
        });
        const followUps = followUpEncounterTypeUuid ? withoutReason : 0;
        return {withReason, withoutReason, followUps};
    }

    _renderItem = ({item, index}) => (
        <RosterRow
            row={item}
            index={index}
            reasonAnswers={this.state.absenceReasonAnswers}
            followUpEncounterTypeUuid={this.state.followUpEncounterTypeUuid}
            onToggle={this._onToggle}
            onPickReason={this._onPickReason}
        />
    );

    render() {
        const {groupSubject, attendanceType, scheduledDate} = this.props;
        const {roster, notes} = this.state;
        const summary = this._summaryCounts();
        const headerSubline = moment(scheduledDate).format("ddd D MMM") + " · " + groupSubject.nameString;

        return (
            <CHSContainer>
                <AppHeader title={attendanceType.name} subTitle={headerSubline}/>
                <CHSContent>
                    <View style={styles.helpRow}>
                        <Text style={styles.helpText}>{this.I18n.t("tapToTogglePrompt")}</Text>
                        <TouchableOpacity onPress={this._onMarkAllAbsent}>
                            <Text style={styles.markAllText}>{this.I18n.t("markAllAbsent")}</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={roster || []}
                        keyExtractor={(r) => r.subjectUUID}
                        renderItem={this._renderItem}
                        ListFooterComponent={(
                            <View style={styles.footer}>
                                <Text style={styles.summaryText}>
                                    {this.I18n.t("rosterSummary", summary)}
                                </Text>
                                <Text style={styles.notesLabel}>{this.I18n.t("sessionNotesOptional").toUpperCase()}</Text>
                                <TextInput
                                    value={notes || ""}
                                    onChangeText={this._onSetNotes}
                                    multiline
                                    style={styles.notesInput}
                                />
                                <TouchableOpacity onPress={this._onSave} style={styles.saveBtn}>
                                    <Text style={styles.saveBtnText}>{this.I18n.t("saveAttendance")}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                    <ActionSelector
                        title={this.I18n.t("reasonForAbsence")}
                        visible={!!this.state.reasonPickerVisible}
                        hide={this._hideReasonPicker}
                        actions={this._reasonActions()}
                    />
                </CHSContent>
            </CHSContainer>
        );
    }
}

const styles = StyleSheet.create({
    helpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: Colors.GreyContentBackground,
    },
    helpText: {fontSize: Styles.smallTextSize, color: Colors.SubheaderColor || '#666', flex: 1},
    markAllText: {color: Colors.ActionButtonColor, fontWeight: 'bold', fontSize: Styles.smallTextSize},
    footer: {padding: 16, backgroundColor: Colors.WhiteContentBackground},
    summaryText: {fontSize: Styles.smallTextSize, color: Colors.SubheaderColor || '#666', marginBottom: 16},
    notesLabel: {fontSize: 11, color: Colors.SubheaderColor || '#666', letterSpacing: 0.5, marginBottom: 4},
    notesInput: {
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal,
        borderRadius: 4,
        padding: 8,
        minHeight: 64,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    saveBtn: {
        backgroundColor: Colors.ActionButtonColor,
        paddingVertical: 12,
        borderRadius: 4,
        alignItems: 'center',
    },
    saveBtnText: {color: Colors.TextOnPrimaryColor, fontWeight: 'bold', fontSize: Styles.normalTextSize},
});

export default RosterView;
