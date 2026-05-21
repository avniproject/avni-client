import React from "react";
import {View} from "react-native";
import PropTypes from "prop-types";
import moment from "moment";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import {AttendanceSheetActions} from "../../action/attendance/AttendanceSheetActions";
import HorizontalDateStrip from "./HorizontalDateStrip";
import DayStatusBanner from "./DayStatusBanner";

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

    _onSelectDate = (date) => {
        this.dispatchAction(AttendanceSheetActions.Names.SELECT_DATE, {date});
    };

    render() {
        const {groupSubject} = this.props;
        const {selectedDate, stripDates, statusByDate} = this.state;
        const selectedStatus = selectedDate
            ? statusByDate.get(moment(selectedDate).format("YYYY-MM-DD"))
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
                        </View>
                    )}
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default AttendanceSheetView;
