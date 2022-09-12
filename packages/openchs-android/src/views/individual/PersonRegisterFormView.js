import {Vibration, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {Actions} from "../../action/individual/PersonRegisterActions";
import TypedTransition from "../../framework/routing/TypedTransition";
import AppHeader from "../common/AppHeader";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import PersonRegisterViewsMixin from "./PersonRegisterViewsMixin";
import {ObservationsHolder} from 'avni-models';
import General from "../../utility/General";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import _ from "lodash";
import PersonRegisterView from "./PersonRegisterView";
import CHSNavigator from "../../utility/CHSNavigator";
import {AvniAlert} from "../common/AvniAlert";
import {RejectionMessage} from "../approval/RejectionMessage";
import SummaryButton from "../common/SummaryButton";
import UserInfoService from "../../service/UserInfoService";
import Timer from "../common/Timer";
import BackgroundTimer from "react-native-background-timer";

@Path('/PersonRegisterFormView')
class PersonRegisterFormView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "PersonRegisterFormView";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.personRegister);
    }

    componentWillMount() {
        if(this.props.params.pageNumber) {
            this.dispatchAction(Actions.ON_FORM_LOAD,
                {
                    individualUUID: this.props.params.individualUUID,
                    workLists: this.props.params.workLists,
                    isDraftEntity: this.props.params.isDraftEntity,
                    pageNumber: this.props.params.pageNumber,
                });
        }
        super.componentWillMount();
    }

    get registrationType() {
        return _.get(this.state, 'workListState.workLists.currentWorkList.name') || 'REG_DISPLAY-Individual';
    }

    onHardwareBackPress() {
        !this.state.wizard.isFirstPage() ? this.previous() : TypedTransition.from(this).goBack();
        return true;
    }

    previous() {
        this.dispatchAction(Actions.PREVIOUS, {
            cb: (newState) => {
                if (newState.wizard.isFirstPage()) {
                    TypedTransition.from(this).goBack();
                }
                this.scrollToTop();
            }
        });
    }

    onAppHeaderBack(saveDraftOn) {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [PersonRegisterView,PersonRegisterFormView]);
        saveDraftOn ? onYesPress() : AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !nextState.wizard.isNonFormPage();
    }

    onStartTimer() {
        this.dispatchAction(Actions.ON_START_TIMER,
            {
                cb: () => BackgroundTimer.runBackgroundTimer(
                    () => this.dispatchAction(Actions.ON_TIMED_FORM,
                        {
                            vibrate: (pattern) => Vibration.vibrate(pattern),
                            nextParams: PersonRegisterViewsMixin.getNextProps(this),
                            //https://github.com/ocetnik/react-native-background-timer/issues/310#issuecomment-1169621884
                            stopTimer: () => setTimeout(() => BackgroundTimer.stopBackgroundTimer(), 0)
                        }),
                    1000
                )
            })
    }

    render() {
        General.logDebug(this.viewName(), `render`);
        const title = this.I18n.t(this.registrationType) + this.I18n.t('registration');
        const subjectType = this.state.individual.subjectType;
        const userInfoService = this.context.getService(UserInfoService);
        const displayTimer = this.state.timerState && this.state.timerState.displayTimer(this.state.formElementGroup);
        return (
            <CHSContainer>
                <CHSContent ref='scroll'>
                    <AppHeader title={title}
                               func={() => this.onAppHeaderBack(this.state.saveDrafts)} displayHomePressWarning={!this.state.saveDrafts}/>
                    {displayTimer ?
                        <Timer timerState={this.state.timerState} onStartTimer={() => this.onStartTimer()} group={this.state.formElementGroup}/> : null}
                    <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.state.individual.latestEntityApprovalStatus}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                        <SummaryButton onPress={() => PersonRegisterViewsMixin.summary(this)}/>
                    </View>
                    <View style={{backgroundColor: '#ffffff', flexDirection: 'column'}}>
                        {_.get(this.state, 'timerState.displayQuestions', true) &&
                            <FormElementGroup observationHolder={new ObservationsHolder(this.state.individual.observations)}
                                          group={this.state.formElementGroup}
                                          actions={Actions}
                                          filteredFormElements={this.state.filteredFormElements}
                                          validationResults={this.state.validationResults}
                                          formElementsUserState={this.state.formElementsUserState}
                                          dataEntryDate={this.state.individual.registrationDate}
                                          onValidationError={(x, y) => this.scrollToPosition(x, y)}
                                          groupAffiliation={this.state.groupAffiliation}
                                          syncRegistrationConcept1UUID={subjectType.syncRegistrationConcept1}
                                          syncRegistrationConcept2UUID={subjectType.syncRegistrationConcept2}
                                          allowedSyncConcept1Values={userInfoService.getSyncConcept1Values()}
                                          allowedSyncConcept2Values={userInfoService.getSyncConcept2Values()}
                        />}
                        {!displayTimer &&
                        <WizardButtons
                            previous={{
                                func: () => this.previous(),
                                label: this.I18n.t('previous')
                            }}
                            next={{
                                func: () => PersonRegisterViewsMixin.next(this),
                                label: this.I18n.t('next')
                            }}
                        />}
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default PersonRegisterFormView;
