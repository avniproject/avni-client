import React from 'react';
import {View, Alert} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import QuestionnaireToolbarItem from "./QuestionnaireToolbarItem";
import TypedTransition from "../../framework/routing/TypedTransition";
import DecisionSupportSessionListView from "../conclusion/DecisionSupportSessionListView";
import MessageService from "../../service/MessageService";
import DecisionSupportSessionService from "../../service/DecisionSupportSessionService";
import ExportService from "../../service/ExportService";

class QuestionnaireToolbar extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
        this.onExportPress = this.onExportPress.bind(this);
        this.toolbarItems = [
            {handlePress: this.onViewSavedSessionsPress, buttonText: "viewSavedSessions"},
            {handlePress: this.onExportPress, buttonText: "export"},
            {handlePress: this.onDeleteSessionsPress, buttonText: "deleteSessions"}
        ];
    }

    onExportPress = () => {
        this.context.getService(ExportService).exportAll();
    };

    onDeleteSessionsPress = () => {
        const service = this.context.getService(DecisionSupportSessionService);
        Alert.alert(
            this.I18n.t('deleteConfirmation'),
            this.I18n.t("numberOfSessions", {count: service.getNumberOfSessions()}),
            [
                {
                    text: 'Yes', onPress: () => {
                    service.deleteAll()
                }
                },
                {
                    text: 'No', onPress: () => {
                }, style: 'cancel'
                }
            ]
        )
    };

    onViewSavedSessionsPress = () => {
        TypedTransition.from(this).to(DecisionSupportSessionListView);
    };

    render() {
        const toolbarItems = this.toolbarItems.map(({handlePress, buttonText})=> (
            <QuestionnaireToolbarItem
                key={buttonText}
                style={this.props.style}
                handlePress={handlePress}
                buttonText={this.I18n.t(buttonText)}/>));
        return (
            <View style={{marginBottom: 30}}>
                <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                    {toolbarItems}
                </View>
            </View>
        );

    }

}

export default QuestionnaireToolbar;