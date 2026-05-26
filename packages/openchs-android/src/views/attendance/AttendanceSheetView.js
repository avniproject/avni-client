import React from "react";
import {ScrollView, StyleSheet, Text, ToastAndroid, View} from "react-native";
import PropTypes from "prop-types";
import moment from "moment";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import DatePicker from "../primitives/DatePicker";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Reducers from "../../reducer";
import {AttendanceSheetActions} from "../../action/attendance/AttendanceSheetActions";
import HorizontalDateStrip from "./HorizontalDateStrip";
import DayStatusBanner from "./DayStatusBanner";
import AttendanceTypePicker from "./AttendanceTypePicker";
import RosterView from "./RosterView";
import DidntHappenPickerView from "./DidntHappenPickerView";
import MarkAnywayConfirmDialog from "./MarkAnywayConfirmDialog";
import VoidConfirmDialog from "./VoidConfirmDialog";
import FormShareActionSheetController from "../common/FormShareActionSheetController";
import SessionShareService from "../../service/attendance/SessionShareService";
import {Session} from "avni-models";
import _ from "lodash";

// Attendance can be captured/edited only within this many days before today;
// older sessions are view-only. Future dates are blocked at the picker.
const EDIT_WINDOW_DAYS = 30;

@Path("/attendanceSheetView")
class AttendanceSheetView extends AbstractComponent {
    static propTypes = {
        groupSubject: PropTypes.object.isRequired,
        initialDate: PropTypes.string,
        onActionCompletion: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.attendanceSheet);
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(AttendanceSheetActions.Names.ON_LOAD, {
            groupSubject: this.props.groupSubject,
            initialDate: this.props.initialDate,
        });
        super.UNSAFE_componentWillMount();
    }

    // Fires on Navigator pop-back (RosterView -> here). Recomputes the selected
    // date's type-picker rows and the strip dot so a save made on the roster
    // surfaces immediately without the user re-tapping the date.
    willFocus() {
        if (this.state && this.state.selectedDate) {
            this.dispatchAction(AttendanceSheetActions.Names.REFRESH);
        }
    }

    // dateKey is a canonical "YYYY-MM-DD" string handed back from the strip.
    _onSelectDate = (dateKey) => {
        this.setState({markAnywayAcknowledgedDate: null});
        this.dispatchAction(AttendanceSheetActions.Names.SELECT_DATE, {date: dateKey});
    };

    // Calendar picker hands back a JS Date; map to the local calendar day.
    _onPickFromCalendar = (date) => {
        if (!date) return;
        this._onSelectDate(moment(date).format("YYYY-MM-DD"));
    };

    _navigateWithType = (attendanceType, ViewClass) => {
        const status = this.state.selectedDate ? this.state.statusByDate.get(this.state.selectedDate) : null;
        TypedTransition.from(this)
            .with({
                groupSubject: this.props.groupSubject,
                attendanceType,
                scheduledDate: this.state.selectedDate,
                dayType: status ? status.dayType : null,
                onActionCompletion: this.props.onActionCompletion,
            })
            .to(ViewClass, true);
    };

    _onMark = (attendanceType) => this._navigateWithType(attendanceType, RosterView);
    _onDidntHappen = (attendanceType) => this._navigateWithType(attendanceType, DidntHappenPickerView);

    // EDIT branches on the existing session's status — Held re-opens the roster,
    // DidntHappen re-opens the reason picker pre-populated.
    _onEdit = (attendanceType, session) => {
        if (session && session.status === Session.status.DIDNT_HAPPEN) {
            this._navigateWithType(attendanceType, DidntHappenPickerView);
        } else {
            this._navigateWithType(attendanceType, RosterView);
        }
    };

    // Bottom sheet payload carries the same {session, attendanceType, groupSubject}
    // triple to both the PDF and Text branches — Share Filled Forms uses the same
    // open(payload) pattern.
    _onShare = (attendanceType, session) => {
        if (!session) return;
        const target = {session, attendanceType, groupSubject: this.props.groupSubject};
        if (this._shareSheet) this._shareSheet.open(target);
    };

    _onSharePdf = (payload) => {
        if (!payload || !payload.session) return;
        this.getService(SessionShareService).sharePdf(payload.session, payload.attendanceType, payload.groupSubject);
    };

    _onShareText = (payload) => {
        if (!payload || !payload.session) return;
        this.getService(SessionShareService).shareText(payload.session, payload.attendanceType, payload.groupSubject);
    };

    // Inline Void button → VoidConfirmDialog → dispatch VOID. The confirm dialog
    // alone forces a deliberate choice for the destructive cascade-void.
    _onVoid = (attendanceType, session) => {
        this.setState({
            voidConfirmVisible: true,
            pendingVoidAttendanceType: attendanceType,
            pendingVoidSession: session,
        });
    };

    _onVoidCancel = () => this.setState({
        voidConfirmVisible: false,
        pendingVoidAttendanceType: null,
        pendingVoidSession: null,
    });

    _onVoidConfirm = () => {
        const session = this.state.pendingVoidSession;
        this.setState({voidConfirmVisible: false});
        if (!session || !session.uuid) return;
        this.dispatchAction(AttendanceSheetActions.Names.VOID, {sessionUuid: session.uuid});
        const fresh = this.getContextState(Reducers.reducerKeys.attendanceSheet);
        const result = fresh && fresh.lastVoidResult;
        if (result && result.skippedFollowUps && result.skippedFollowUps.length > 0) {
            ToastAndroid.show(
                this.I18n.t("voidSkippedFollowUpsWarning", {count: result.skippedFollowUps.length}),
                ToastAndroid.LONG,
            );
        }
    };

    _onMarkAnyway = () => {
        if (_.isEmpty(this.state.attendanceTypes)) {
            this.showError(this.I18n.t("noAttendanceTypesConfigured"));
            return;
        }
        this.setState({markAnywayConfirmVisible: true});
    };
    _onMarkAnywayCancel = () => this.setState({markAnywayConfirmVisible: false});
    // Acknowledging unhides the attendance-type rows for the selected date so the
    // user can pick Mark (-> RosterView) or Didn't Happen (-> reason picker) just
    // as they would on a normal working day.
    _onMarkAnywayContinue = () => {
        this.setState({
            markAnywayConfirmVisible: false,
            markAnywayAcknowledgedDate: this.state.selectedDate,
        });
    };

    render() {
        const {groupSubject} = this.props;
        const {selectedDate, stripDates, statusByDate, attendanceTypes, sessionByType} = this.state;
        const selectedStatus = selectedDate ? statusByDate.get(selectedDate) : null;
        // On weekly_off / public_holiday the type-picker rows are hidden by default
        // so the user is funnelled through the banner's Mark-anyway confirmation.
        // Once they confirm for a date, we reveal the rows for that date and let
        // them pick Mark or Didn't Happen as on a working day. Rows for types
        // with an already-saved session stay visible regardless so they can be
        // re-opened or edited.
        const dayType = selectedStatus && selectedStatus.dayType;
        const isHolidayLikeRaw = dayType === "weekly_off" || dayType === "public_holiday";
        // Acknowledgment is sticky for the day: an explicit Mark-Anyway tap this
        // session, OR any saved session for this date (Held or DidntHappen),
        // means the user has already engaged with the holiday once and doesn't
        // need to re-confirm to mark additional attendance types.
        const hasAnySavedSessionForDate = Array.from((sessionByType || new Map()).values())
            .some(info => info && info.session);
        const markAnywayAcknowledged = this.state.markAnywayAcknowledgedDate === selectedDate
            || hasAnySavedSessionForDate;
        const isHolidayLike = isHolidayLikeRaw && !markAnywayAcknowledged;
        // Sessions older than EDIT_WINDOW_DAYS are view-only; future dates can't be
        // reached (the picker caps at today). Outside the window we show only the
        // attendance types that already have a saved session, for read-only viewing.
        const todayKey = moment().format("YYYY-MM-DD");
        const daysAgo = selectedDate
            ? moment.utc(todayKey, "YYYY-MM-DD").diff(moment.utc(selectedDate, "YYYY-MM-DD"), "days")
            : 0;
        const editable = daysAgo >= 0 && daysAgo <= EDIT_WINDOW_DAYS;
        const savedTypes = (attendanceTypes || []).filter(at => {
            const info = sessionByType.get(at.uuid);
            return info && info.session;
        });
        const visibleTypes = (!editable || isHolidayLike) ? savedTypes : (attendanceTypes || []);

        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t("attendance") + " · " + groupSubject.nameString}/>
                <CHSContent>
                    {selectedDate && (
                        <ScrollView keyboardShouldPersistTaps="handled">
                            <View style={styles.pickerRow}>
                                <Text style={styles.pickerLabel}>{this.I18n.t("jumpToDate")}</Text>
                                <DatePicker
                                    nonRemovable
                                    dateValue={moment(selectedDate, "YYYY-MM-DD").toDate()}
                                    maximumDate={new Date()}
                                    onChange={this._onPickFromCalendar}
                                    overridingStyle={styles.pickerValue}
                                />
                            </View>
                            <HorizontalDateStrip
                                dates={stripDates}
                                statusByDate={statusByDate}
                                selectedDate={selectedDate}
                                onSelect={this._onSelectDate}
                            />
                            <DayStatusBanner
                                selectedDate={selectedDate}
                                dayType={dayType}
                                marker={selectedStatus && selectedStatus.marker}
                                onMarkAnyway={(markAnywayAcknowledged || !editable) ? null : this._onMarkAnyway}
                            />
                            {!editable && (
                                <Text style={styles.viewOnlyNote}>
                                    {this.I18n.t("attendanceEditWindowClosed", {days: EDIT_WINDOW_DAYS})}
                                </Text>
                            )}
                            <AttendanceTypePicker
                                attendanceTypes={visibleTypes}
                                sessionByType={sessionByType}
                                editable={editable}
                                onMark={this._onMark}
                                onDidntHappen={this._onDidntHappen}
                                onEdit={this._onEdit}
                                onShare={this._onShare}
                                onVoid={this._onVoid}
                            />
                        </ScrollView>
                    )}
                    <MarkAnywayConfirmDialog
                        visible={!!this.state.markAnywayConfirmVisible}
                        date={selectedDate}
                        onCancel={this._onMarkAnywayCancel}
                        onContinue={this._onMarkAnywayContinue}
                    />
                    <VoidConfirmDialog
                        visible={!!this.state.voidConfirmVisible}
                        attendanceTypeName={this.state.pendingVoidAttendanceType && this.state.pendingVoidAttendanceType.name}
                        onCancel={this._onVoidCancel}
                        onConfirm={this._onVoidConfirm}
                    />
                    <FormShareActionSheetController
                        ref={r => this._shareSheet = r}
                        onSharePdf={this._onSharePdf}
                        onShareText={this._onShareText}
                    />
                </CHSContent>
            </CHSContainer>
        );
    }
}

const styles = StyleSheet.create({
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 6,
    },
    pickerLabel: {fontSize: Styles.smallTextSize, color: Colors.SubheaderColor || '#666', marginRight: 8},
    pickerValue: {fontSize: Styles.normalTextSize, color: Colors.ActionButtonColor},
    viewOnlyNote: {
        fontSize: Styles.smallTextSize,
        color: Colors.SubheaderColor || '#666',
        fontStyle: 'italic',
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
});

export default AttendanceSheetView;
