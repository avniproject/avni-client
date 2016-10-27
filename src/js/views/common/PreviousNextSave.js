import {StyleSheet, Text, View, TouchableHighlight, Navigator, Alert} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from "../../framework/routing/TypedTransition";
import QuestionnaireListView from "../questionnaireList/QuestionnaireListView";
import WizardButtons from "./WizardButtons";
import AppState from '../../hack/AppState';
import DecisionSupportSessionService from "../../service/DecisionSupportSessionService";
import MessageService from "../../service/MessageService";

class PreviousNext extends Component {
    static contextTypes = {
        getService: React.PropTypes.func.isRequired,
        navigator: React.PropTypes.func.isRequired,
    };

    static propTypes = {
        hasQuestionBefore: React.PropTypes.bool.isRequired,
        nextParams: React.PropTypes.object,
        parent: React.PropTypes.object.isRequired,
        onNext: React.PropTypes.func.isRequired,
        validationFn: React.PropTypes.func
    };

    constructor(props, context) {
        super(props, context);
        this.onNext = this.onNext.bind(this);
        this.onPrevious = this.onPrevious.bind(this);
        this.onSave = this.onSave.bind(this);
        this.I18n = context.getService(MessageService).getI18n();
    }

    onPrevious() {
        TypedTransition.from(this.props.parent).goBack();
    };

    onNext() {
        if (this.props.validationFn !== undefined) {
            var validationResult = this.props.validationFn();
            if (!validationResult.status) {
                Alert.alert(this.I18n.t("validationError"), validationResult.message,
                    [
                        {
                            text: this.I18n.t('ok'), onPress: () => {
                        }
                        }
                    ]
                );
                return;
            }
        }
        this.props.onNext();
    };

    onSave() {
        const decisionSupportSessionService = this.context.getService(DecisionSupportSessionService);
        decisionSupportSessionService.save(AppState.questionnaireAnswers, this.props.nextParams.decisions);
        TypedTransition.from(this).resetTo(QuestionnaireListView);
    }

    render() {
        const previous = {text: "previous", visible: true, func: this.onPrevious};
        const next = {text: "next", visible: true, func: this.onNext};
        const save = {text: "saveAndRestart", visible: !this.props.nextView, func: this.onSave};
        var buttons = [previous];
        buttons.push(this.props.nextView ? next : save);
        return (
            <WizardButtons buttons={buttons}/>
        );
    }
}

export default PreviousNext;