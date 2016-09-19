import {StyleSheet, Text, View, TouchableHighlight, Navigator, Alert} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from "../../framework/routing/TypedTransition";
import QuestionnaireListView from "../questionnaireList/QuestionnaireListView";
import WizardButtons from "./WizardButtons";
import AppState from '../../hack/AppState';
import DecisionSupportSessionService from "../../service/DecisionSupportSessionService";

class PreviousNext extends Component {
    static contextTypes = {
        getService: React.PropTypes.func.isRequired,
        navigator: React.PropTypes.func.isRequired,
    };

    static propTypes = {
        hasQuestionBefore: React.PropTypes.bool.isRequired,
        nextParams: React.PropTypes.object.isRequired,
        parent: React.PropTypes.object.isRequired,
        nextView: React.PropTypes.func,
        validationFn: React.PropTypes.func
    };

    constructor(props, context) {
        super(props, context);
        this.onNext = this.onNext.bind(this);
        this.onPrevious = this.onPrevious.bind(this);
        this.onSave = this.onSave.bind(this);
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
                            text: 'OK', onPress: () => {
                        }
                        }
                    ]
                );
                return;
            }
        }
        var typedTransition = TypedTransition.from(this.props.parent);
        typedTransition.with(this.props.nextParams).to(this.props.nextView);
    };

    onSave() {
        const decisionSupportSessionService = this.context.getService(DecisionSupportSessionService);
        decisionSupportSessionService.save(AppState.questionnaireAnswers, this.props.nextParams.decisions);
        TypedTransition.from(this).resetTo(QuestionnaireListView);
    }

    render() {
        const previous = {text: "previous", visible: !this.props.hasQuestionBefore, func: this.onPrevious};
        const next = {text: "next", visible: true, func: this.onNext};
        const save = {text: "saveAndRestart", visible: false, func: this.onSave};
        var buttons = [previous];
        buttons.push(this.props.nextView ? next : save);
        return (
            <WizardButtons buttons={buttons}/>
        );
    }
}

export default PreviousNext;