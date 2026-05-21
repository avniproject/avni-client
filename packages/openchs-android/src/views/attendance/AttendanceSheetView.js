import React from "react";
import {View} from "react-native";
import PropTypes from "prop-types";
import {DateTimeUtil} from "openchs-models";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import {AttendanceSheetActions} from "../../action/attendance/AttendanceSheetActions";
import HorizontalDateStrip from "./HorizontalDateStrip";
import DayStatusBanner from "./DayStatusBanner";
import AttendanceTypePicker from "./AttendanceTypePicker";
import RosterView from "./RosterView";

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

    _onSelectDate = (date) => {
        this.dispatchAction(AttendanceSheetActions.Names.SELECT_DATE, {date});
    };

    _navigateToRoster = (attendanceType) => {
        TypedTransition.from(this)
            .with({
                groupSubject: this.props.groupSubject,
                attendanceType,
                scheduledDate: this.state.selectedDate,
            })
            .to(RosterView, true);
    };

    _onMark = (attendanceType) => this._navigateToRoster(attendanceType);
    _onEdit = (attendanceType /*, session */) => this._navigateToRoster(attendanceType);
    _onDidntHappen = (/* attendanceType */) => {
        // Phase 6 wires this to DidntHappenPickerView.
    };

    render() {
        const {groupSubject} = this.props;
        const {selectedDate, stripDates, statusByDate, attendanceTypes, sessionByType} = this.state;
        const selectedStatus = selectedDate
            ? statusByDate.get(DateTimeUtil.toCalendarDateString(selectedDate))
            : null;

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
                                dayType={selectedStatus && selectedStatus.dayType}
                                marker={selectedStatus && selectedStatus.marker}
                            />
                            <AttendanceTypePicker
                                attendanceTypes={attendanceTypes}
                                sessionByType={sessionByType}
                                onMark={this._onMark}
                                onDidntHappen={this._onDidntHappen}
                                onEdit={this._onEdit}
                            />
                        </View>
                    )}
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default AttendanceSheetView;
