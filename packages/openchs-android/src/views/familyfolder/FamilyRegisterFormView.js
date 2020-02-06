import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import {Actions} from "../../action/familyFolder/FamilyRegisterActions";
import TypedTransition from "../../framework/routing/TypedTransition";
import AppHeader from "../common/AppHeader";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import FamilyRegisterViewsMixin from "./FamilyRegisterViewsMixin";
import {ObservationsHolder} from 'avni-models';
import General from "../../utility/General";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";

@Path('/FamilyRegisterFormView')
class FamilyRegisterFormView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "FamilyRegisterFormView";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.familyRegister);
    }

    previous() {
        this.dispatchAction(Actions.PREVIOUS, {
            cb: (newState) => {
                if (newState.wizard.isFirstPage())
                    TypedTransition.from(this).goBack();
            }
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !nextState.wizard.isNonFormPage()
    }

    render() {
        General.logDebug(this.viewName(), `render`);
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('registration')} func={() => this.previous()}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                        <FormElementGroup observationHolder={new ObservationsHolder(this.state.family.observations)}
                                          group={this.state.formElementGroup}
                                          actions={Actions} validationResults={this.state.validationResults}
                                          formElementsUserState={this.state.formElementsUserState}
                                          dataEntryDate={this.state.family.registrationDate}
                                          onValidationError={(x, y) => this.scrollToPosition(x, y)}/>
                        <WizardButtons previous={{func: () => this.previous(), label: this.I18n.t('previous')}}
                                       next={{
                                           func: () => FamilyRegisterViewsMixin.next(this),
                                           label: this.I18n.t('next')
                                       }}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default FamilyRegisterFormView;