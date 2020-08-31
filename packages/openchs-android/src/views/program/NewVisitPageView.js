// @flow
import PropTypes from "prop-types";
import React from "react";
import {SectionList, StyleSheet, Text, ToastAndroid, TouchableNativeFeedback, View} from "react-native";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import General from "../../utility/General";
import {ProgramEncounter} from "avni-models";
import NewVisitMenuView from "./NewVisitMenuView";
import CHSNavigator from "../../utility/CHSNavigator";
import {AvniAlert} from "../common/AvniAlert";

@Path("/NewVisitPageView")
class NewVisitPageView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    onAppHeaderBack() {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [NewVisitPageView]);
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    render() {
        General.logDebug(this.viewName(), "render");

        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t("chooseVisit")}
                               backFunction={() => this.onAppHeaderBack()}
                    />
                    <View>
                        <NewVisitMenuView enrolmentUUID={this.props.params.enrolmentUUID} allowedEncounterTypeUuids={this.props.params.allowedEncounterTypeUuids}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default NewVisitPageView;
