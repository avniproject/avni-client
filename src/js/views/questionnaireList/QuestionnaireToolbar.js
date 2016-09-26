import React from 'react';
import {View, Alert} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import QuestionnaireToolbarItem from "./QuestionnaireToolbarItem";
import TypedTransition from "../../framework/routing/TypedTransition";
import DecisionSupportSessionListView from "../conclusion/DecisionSupportSessionListView";
import MessageService from "../../service/MessageService";
import DecisionSupportSessionService from "../../service/DecisionSupportSessionService";
import _ from 'lodash';
import ExportService from "../../service/ExportService";

class QuestionnaireToolbar extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
        this.onExportPress = this.onExportPress.bind(this);
        this._exporting = this._exporting.bind(this);
        this.raiseError = this.raiseError.bind(this);
        this.state = {
            toolbarItems: {
                "viewSavedSessions": {
                    handlePress: this.onViewSavedSessionsPress,
                    buttonText: "viewSavedSessions",
                    loading: false
                },
                "export": {handlePress: this.onExportPress, buttonText: "export", loading: false},
                "download": {handlePress: this.onDownloadPress, buttonText: "download", loading: false}
            }
        };
    }

    static propTypes = {
        styles: React.PropTypes.object.isRequired
    };

    _exporting(loading) {
        this.setState({
            toolbarItems: Object.assign({}, this.state.toolbarItems,
                {"export": Object.assign({}, this.state.toolbarItems.export, {"loading": loading})})
        });
    }

    _downloading(loading) {
        this.setState({
            toolbarItems: Object.assign({}, this.state.toolbarItems,
                {"download": Object.assign({}, this.state.toolbarItems.download, {"loading": loading})})
        });
    }

    raiseError(message) {
        this.setState({
                toolbarItems: Object.assign({}, this.state.toolbarItems,
                    {
                        "export": Object.assign({}, this.state.toolbarItems.export, {"loading": false}),
                        "download": Object.assign({}, this.state.toolbarItems.download, {"loading": false})
                    }),
                error: true, errorMessage: `${message}`
            },
        );
    }

    onExportPress = () => {
        this._exporting(true);
        this.context.getService(ExportService).exportAll(()=> this._exporting(false), this.raiseError);
    };

    onDownloadPress = () => {
        this._downloading(true);
        this.context.getService(ExportService).downloadAll(()=> this._downloading(false), this.raiseError);
    };

    onViewSavedSessionsPress = () => {
        TypedTransition.from(this).to(DecisionSupportSessionListView);
    };

    render() {
        const toolbarItems = _.map(this.state.toolbarItems, ({handlePress, buttonText, loading}, key)=> (
            <QuestionnaireToolbarItem
                key={buttonText}
                styles={this.props.styles}
                handlePress={handlePress}
                loading={loading}
                buttonText={buttonText}/>));
        return (
            <View style={this.props.styles.questionnaireToolBarMain}>
                {this.showError("exportError")}
                {toolbarItems}
            </View>
        );
    }
}

export default QuestionnaireToolbar;