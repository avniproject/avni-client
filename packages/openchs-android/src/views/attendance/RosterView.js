import React from "react";
import {FlatList, InteractionManager, StyleSheet, Text, TextInput, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import moment from "moment";
import {AttendanceRecord} from "avni-models";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import ActionSelector from "../common/ActionSelector";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Reducers from "../../reducer";
import {RosterActions} from "../../action/attendance/RosterActions";
import RosterRow from "./RosterRow";
import FollowUpConfirmationDialog from "./FollowUpConfirmationDialog";
import SessionShareService from "../../service/attendance/SessionShareService";

@Path("/attendanceRosterView")
class RosterView extends AbstractComponent {
    static propTypes = {
        groupSubject: PropTypes.object.isRequired,
        attendanceType: PropTypes.object.isRequired,
        // Canonical "YYYY-MM-DD" — the attendance flow is time/timezone agnostic.
        scheduledDate: PropTypes.string.isRequired,
        // Calendar day_type for the scheduled date — drives the holiday-mode rules
        // (notes become required on weekly_off / public_holiday).
        dayType: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.attendanceRoster);
        this._pickingFor = null;
        // Double-tap on Save would re-dispatch and drop pendingAutoShareWorkItem.
        this._saveInFlight = false;
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(RosterActions.Names.ON_LOAD, {
            groupSubject: this.props.groupSubject,
            attendanceType: this.props.attendanceType,
            scheduledDate: this.props.scheduledDate,
            dayType: this.props.dayType,
        });
        super.UNSAFE_componentWillMount();
    }

    _onToggle = (subjectUUID) => this.dispatchAction(RosterActions.Names.TOGGLE_PRESENCE, {subjectUUID});
    _onSetNotes = (notes) => this.dispatchAction(RosterActions.Names.SET_NOTES, {notes});
    _onMarkAllAbsent = () => this.dispatchAction(RosterActions.Names.MARK_ALL_ABSENT);
    // dispatchAction returns BEFORE React's setState (driven by store.subscribe) flushes,
    // so this.state would still be the pre-save snapshot. Read directly from the store.
    _onSave = () => {
        if (this._saveInFlight) return;
        this._saveInFlight = true;
        this.dispatchAction(RosterActions.Names.SAVE);
        const freshState = this.getContextState(Reducers.reducerKeys.attendanceRoster);
        if (freshState && freshState.saveError) {
            this._saveInFlight = false;
            this.showError(this.I18n.t(freshState.saveError));
            return;
        }
        const result = freshState && freshState.lastSaveResult;
        // Capture service ref while still mounted; goBack unmounts before InteractionManager fires.
        this._pendingAutoShareWorkItem = (freshState && freshState.pendingAutoShareWorkItem) || null;
        this._pendingShareService = this.getService(SessionShareService);
        const hasFollowUps = result && ((result.createdFollowUps || []).length > 0 || (result.skippedFollowUps || []).length > 0);
        if (hasFollowUps) {
            this.setState({confirmationVisible: true});
        } else {
            TypedTransition.from(this).goBack();
            this._fireAutoShareIfPending();
        }
    };

    // Modal flips invisible before goBack so the native dialog doesn't strand on the prior screen.
    _onDismissConfirmation = () => {
        this.setState({confirmationVisible: false}, () => {
            TypedTransition.from(this).goBack();
            this._fireAutoShareIfPending();
        });
    };

    _fireAutoShareIfPending = () => {
        const wi = this._pendingAutoShareWorkItem;
        const shareService = this._pendingShareService;
        this._pendingAutoShareWorkItem = null;
        this._pendingShareService = null;
        if (!wi || !shareService) return;
        InteractionManager.runAfterInteractions(() => {
            shareService.dispatchShareSessionWorkItem(wi);
        });
    };

    _onPickReason = (subjectUUID) => {
        this._pickingFor = subjectUUID;
        this.setState({reasonPickerVisible: true});
    };

    _hideReasonPicker = () => {
        this._pickingFor = null;
        this.setState({reasonPickerVisible: false});
    };

    _onPickSessionReason = () => this.setState({sessionReasonPickerVisible: true});
    _hideSessionReasonPicker = () => this.setState({sessionReasonPickerVisible: false});

    _sessionReasonActions() {
        return (this.state.sessionReasonAnswers || []).map(a => ({
            label: a.name,
            fn: () => {
                this.dispatchAction(RosterActions.Names.SET_SESSION_REASON, {reasonConceptUUID: a.uuid});
            },
        }));
    }

    _selectedSessionReasonName() {
        const {sessionReasonConceptUUID, sessionReasonAnswers} = this.state;
        if (!sessionReasonConceptUUID) return this.I18n.t("selectReason");
        const match = (sessionReasonAnswers || []).find(a => a.uuid === sessionReasonConceptUUID);
        return match ? match.name : this.I18n.t("selectReason");
    }

    _reasonActions() {
        // ActionSelector calls props.hide() before invoking fn, which clears
        // this._pickingFor — close over the current value so the dispatch sees
        // the actual subject the user opened the picker for.
        const subjectUUID = this._pickingFor;
        return (this.state.absenceReasonAnswers || []).map(a => ({
            label: a.name,
            fn: () => {
                this.dispatchAction(RosterActions.Names.SET_REASON, {
                    subjectUUID,
                    reasonConceptUUID: a.uuid,
                });
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
        const {roster, notes, dayType, sessionReasonConceptUUID} = this.state;
        const summary = this._summaryCounts();
        const headerSubline = moment.utc(scheduledDate, "YYYY-MM-DD").format("ddd D MMM") + " · " + groupSubject.nameString;
        const holidayMode = RosterActions.isHolidayLikeDayType(dayType);
        const notesEmpty = (notes || "").trim().length === 0;
        const reasonMissing = !sessionReasonConceptUUID;
        const saveDisabled = holidayMode && (reasonMissing || notesEmpty);

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
                                {holidayMode && (
                                    <View style={styles.sessionReasonBlock}>
                                        <Text style={styles.notesLabel}>{this.I18n.t("sessionReasonRequiredOnHoliday").toUpperCase()}</Text>
                                        <TouchableOpacity onPress={this._onPickSessionReason} style={styles.sessionReasonPicker}>
                                            <Text style={styles.sessionReasonText}>{this._selectedSessionReasonName()}</Text>
                                            <Text style={styles.sessionReasonChevron}>▾</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <Text style={styles.notesLabel}>
                                    {this.I18n.t(holidayMode ? "sessionNotesRequiredOnHoliday" : "sessionNotesOptional").toUpperCase()}
                                </Text>
                                <TextInput
                                    value={notes || ""}
                                    onChangeText={this._onSetNotes}
                                    multiline
                                    style={styles.notesInput}
                                />
                                <TouchableOpacity
                                    onPress={this._onSave}
                                    disabled={saveDisabled}
                                    style={[styles.saveBtn, saveDisabled && styles.saveBtnDisabled]}>
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
                    <ActionSelector
                        title={this.I18n.t("sessionReasonRequiredOnHoliday")}
                        visible={!!this.state.sessionReasonPickerVisible}
                        hide={this._hideSessionReasonPicker}
                        actions={this._sessionReasonActions()}
                    />
                    <FollowUpConfirmationDialog
                        visible={!!this.state.confirmationVisible}
                        result={this.state.lastSaveResult}
                        onDismiss={this._onDismissConfirmation}
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
    sessionReasonBlock: {marginBottom: 12},
    sessionReasonPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.InputBorderNormal,
    },
    sessionReasonText: {flex: 1, fontSize: Styles.normalTextSize, color: Colors.InputNormal},
    sessionReasonChevron: {fontSize: 16, color: Colors.SubheaderColor || '#666'},
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
    saveBtnDisabled: {backgroundColor: Colors.DisabledButtonColor || '#c2c5c6'},
    saveBtnText: {color: Colors.TextOnPrimaryColor, fontWeight: 'bold', fontSize: Styles.normalTextSize},
});

export default RosterView;
