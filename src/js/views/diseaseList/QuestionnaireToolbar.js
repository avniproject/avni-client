import React from 'react';
import {View, Alert} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import QuestionnaireToolbarItem from "./QuestionnaireToolbarItem";
import TypedTransition from "../../framework/routing/TypedTransition";
import DecisionSupportSessionListView from "../conclusion/DecisionSupportSessionListView";
import MessageService from "../../service/MessageService";
import DecisionSupportSessionService from "../../service/DecisionSupportSessionService";
import {Map} from 'immutable';
import _ from 'lodash';
import ExportService from "../../service/ExportService";

class QuestionnaireToolbar extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
        this.onExportPress = this.onExportPress.bind(this);
        this._exporting = this._exporting.bind(this);
        this.state = {
            toolbarItems: {
                "viewSavedSessions": {
                    handlePress: this.onViewSavedSessionsPress,
                    buttonText: "viewSavedSessions",
                    loading: false
                },
                "export": {handlePress: this.onExportPress, buttonText: "export", loading: false},
                "deleteSessions": {
                    handlePress: this.onDeleteSessionsPress,
                    buttonText: "deleteSessions",
                    loading: false
                }
            }
        };
    }

    _exporting(loading) {
        this.setState({
            toolbarItems: Object.assign({}, this.state.toolbarItems,
                {"export": Object.assign({}, this.state.toolbarItems.export, {"loading": loading})})
        });
    }

    onExportPress = () => {
        this._exporting(true);
        this.context.getService(ExportService).exportAll(()=> this._exporting(false));
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
        const toolbarItems = _.map(this.state.toolbarItems, ({handlePress, buttonText, loading}, key)=> (
            <QuestionnaireToolbarItem
                key={buttonText}
                style={this.props.style}
                handlePress={handlePress}
                loading={loading}
                buttonText={buttonText}/>));
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