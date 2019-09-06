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
import {ProgramEncounter} from "openchs-models";
import NewVisitMenuView from "./NewVisitMenuView";

@Path("/NewVisitPageView")
class NewVisitPageView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        General.logDebug(this.viewName(), "render");

        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t("chooseVisit")}/>
                    <View>
                        <NewVisitMenuView
                            params={{enrolmentUUID:this.props.params.enrolmentUUID}}
                        />
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default NewVisitPageView;
