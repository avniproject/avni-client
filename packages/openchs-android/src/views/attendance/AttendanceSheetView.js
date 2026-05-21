import React from "react";
import {View} from "react-native";
import PropTypes from "prop-types";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";

@Path("/attendanceSheetView")
class AttendanceSheetView extends AbstractComponent {
    static propTypes = {
        groupSubject: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const {groupSubject} = this.props;
        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t("attendance") + " · " + groupSubject.nameString}/>
                <CHSContent>
                    <View/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default AttendanceSheetView;
