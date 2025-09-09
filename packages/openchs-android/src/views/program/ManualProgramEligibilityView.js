import React from 'react'
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {ManualProgramEligibilityActionNames as Actions} from '../../action/program/ManualProgramEligibilityActions'
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import {View} from "react-native";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import CHSNavigator from "../../utility/CHSNavigator";
import {AvniAlert} from "../common/AvniAlert";
import TypedTransition from "../../framework/routing/TypedTransition";
import FormMappingService from "../../service/FormMappingService";
import PropTypes from 'prop-types';
import {ObservationsHolder} from 'avni-models';

@Path('/ManualProgramEligibilityView')
class ManualProgramEligibilityView extends AbstractComponent {
    static propTypes = {
        subject: PropTypes.object.isRequired,
        program: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.manualProgramEligibility);
    }

    viewName() {
        return 'ManualProgramEligibilityView';
    }

    UNSAFE_componentWillMount() {
        const {subject, program} = this.props;
        this.dispatchAction(Actions.ON_LOAD, {subject, program});
        super.UNSAFE_componentWillMount();
    }

    next() {
        this.dispatchAction(Actions.ON_NEXT, {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits) => {
                const onSaveCallback = (source) => {
                    CHSNavigator.navigateToProgramEnrolmentDashboardView(source, this.props.subject.uuid, null, true, null, null, 1);
                };
                const headerMessage = `${this.I18n.t('manualProgramEligibility')} - ${this.I18n.t('summaryAndRecommendations')}`;
                const form = this.getService(FormMappingService).getManualEnrolmentEligibilityForm(this.props.subject.subjectType, this.props.program);
                CHSNavigator.navigateToSystemsRecommendationView(this, decisions, ruleValidationErrors, null, state.subjectProgramEligibility.observations, Actions.ON_SAVE, onSaveCallback, headerMessage, checklists, nextScheduledVisits, form);
            },
            movedNext: this.scrollToTop
        });
    }

    previous() {
        this.state.wizard.isFirstPage() ? this.goBack() : this.dispatchAction(Actions.ON_PREVIOUS, {cb: this.scrollToTop});
    }

    onAppHeaderBack() {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [ManualProgramEligibilityView]);
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    render() {
        return (
            <CHSContainer>
                <CHSContent ref="scroll">
                    <AppHeader title={this.I18n.t('manualProgramEligibility')} func={() => this.onAppHeaderBack()} displayHomePressWarning={true}/>
                    <View style={{backgroundColor: '#ffffff', flexDirection: 'column'}}>
                        <FormElementGroup group={this.state.formElementGroup}
                                          observationHolder={new ObservationsHolder(this.state.subjectProgramEligibility.observations)}
                                          actions={Actions}
                                          validationResults={this.state.validationResults}
                                          filteredFormElements={this.state.filteredFormElements}
                                          formElementsUserState={this.state.formElementsUserState}
                                          dataEntryDate={this.state.subjectProgramEligibility.checkDate}
                                          onValidationError={(x, y) => this.scrollToPosition(x, y)}
                        />
                        <WizardButtons
                            previous={{
                                visible: !this.state.wizard.isFirstPage(),
                                func: () => this.previous(),
                                label: this.I18n.t('previous')
                            }}
                            next={{
                                func: () => this.next(),
                                label: this.I18n.t('next')
                            }}
                        />
                    </View>
                </CHSContent>
            </CHSContainer>
        );

    }
}


export default ManualProgramEligibilityView;
