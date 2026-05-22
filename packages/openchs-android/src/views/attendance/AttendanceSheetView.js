import React from "react";
import {ToastAndroid, View} from "react-native";
import PropTypes from "prop-types";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import ActionSelector from "../common/ActionSelector";
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

@Path("/attendanceSheetView")
class AttendanceSheetView extends AbstractComponent {
    static propTypes = {
        groupSubject: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.attendanceSheet);
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(AttendanceSheetActions.Names.ON_LOAD, {groupSubject: this.props.groupSubject});
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
        this.dispatchAction(AttendanceSheetActions.Names.SELECT_DATE, {date: dateKey});
    };

    _navigateWithType = (attendanceType, ViewClass) => {
        TypedTransition.from(this)
            .with({
                groupSubject: this.props.groupSubject,
                attendanceType,
                scheduledDate: this.state.selectedDate,
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

    // ⋮ → ActionSelector → "Void" → VoidConfirmDialog → dispatch VOID. Three taps
    // for a destructive cascade-void is intentional: the action sheet keeps the
    // overflow menu extensible (future actions land here too), the confirm dialog
    // forces a deliberate choice.
    _onOverflow = (attendanceType, session) => {
        this.setState({
            overflowVisible: true,
            overflowAttendanceType: attendanceType,
            overflowSession: session,
        });
    };

    _hideOverflow = () => this.setState({overflowVisible: false});

    // Bottom sheet payload carries the same {session, attendanceType, groupSubject}
    // triple to both the PDF and Text branches — Share Filled Forms uses the same
    // open(payload) pattern.
    _onShareSelected = () => {
        const target = {
            session: this.state.overflowSession,
            attendanceType: this.state.overflowAttendanceType,
            groupSubject: this.props.groupSubject,
        };
        this.setState({overflowVisible: false}, () => {
            if (this._shareSheet) this._shareSheet.open(target);
        });
    };

    _onSharePdf = (payload) => {
        if (!payload || !payload.session) return;
        this.getService(SessionShareService).sharePdf(payload.session, payload.attendanceType, payload.groupSubject);
    };

    _onShareText = (payload) => {
        if (!payload || !payload.session) return;
        this.getService(SessionShareService).shareText(payload.session, payload.attendanceType, payload.groupSubject);
    };

    _overflowActions = () => {
        return [
            {
                label: this.I18n.t("shareActionLabel"),
                fn: this._onShareSelected,
            },
            {
                label: this.I18n.t("voidActionLabel"),
                fn: () => this.setState({
                    overflowVisible: false,
                    voidConfirmVisible: true,
                }),
            },
        ];
    };

    _onVoidCancel = () => this.setState({
        voidConfirmVisible: false,
        overflowAttendanceType: null,
        overflowSession: null,
    });

    _onVoidConfirm = () => {
        const session = this.state.overflowSession;
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
    // Mark-anyway on calendar-off days routes to the DidntHappen picker so the
    // user supplies a required reason explaining the override. Picking
    // attendanceType[0] keeps v1 simple; future iteration can ask first.
    _onMarkAnywayContinue = () => {
        const firstType = (this.state.attendanceTypes || [])[0];
        if (!firstType) {
            this.setState({markAnywayConfirmVisible: false});
            this.showError(this.I18n.t("noAttendanceTypesConfigured"));
            return;
        }
        this.setState({markAnywayConfirmVisible: false}, () => {
            this._navigateWithType(firstType, DidntHappenPickerView);
        });
    };

    render() {
        const {groupSubject} = this.props;
        const {selectedDate, stripDates, statusByDate, attendanceTypes, sessionByType} = this.state;
        const selectedStatus = selectedDate ? statusByDate.get(selectedDate) : null;
        // On weekly_off / public_holiday, the per-type Mark/DidntHappen buttons
        // would let the user bypass the required Mark-anyway reason flow. We
        // hide unmarked rows so the user is forced through the banner CTA, but
        // keep rows for types that already have a saved session so they can be
        // re-opened or edited.
        const dayType = selectedStatus && selectedStatus.dayType;
        const isHolidayLike = dayType === "weekly_off" || dayType === "public_holiday";
        const visibleTypes = isHolidayLike
            ? (attendanceTypes || []).filter(at => {
                const info = sessionByType.get(at.uuid);
                return info && info.session;
            })
            : (attendanceTypes || []);

        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t("attendance") + " · " + groupSubject.nameString}/>
                <CHSContent>
                    {selectedDate && (
                        <View>
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
                                onMarkAnyway={this._onMarkAnyway}
                            />
                            <AttendanceTypePicker
                                attendanceTypes={visibleTypes}
                                sessionByType={sessionByType}
                                onMark={this._onMark}
                                onDidntHappen={this._onDidntHappen}
                                onEdit={this._onEdit}
                                onOverflow={this._onOverflow}
                            />
                        </View>
                    )}
                    <MarkAnywayConfirmDialog
                        visible={!!this.state.markAnywayConfirmVisible}
                        date={selectedDate}
                        onCancel={this._onMarkAnywayCancel}
                        onContinue={this._onMarkAnywayContinue}
                    />
                    <ActionSelector
                        title={this.state.overflowAttendanceType ? this.state.overflowAttendanceType.name : ""}
                        visible={!!this.state.overflowVisible}
                        hide={this._hideOverflow}
                        actions={this._overflowActions()}
                    />
                    <VoidConfirmDialog
                        visible={!!this.state.voidConfirmVisible}
                        attendanceTypeName={this.state.overflowAttendanceType && this.state.overflowAttendanceType.name}
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

export default AttendanceSheetView;
