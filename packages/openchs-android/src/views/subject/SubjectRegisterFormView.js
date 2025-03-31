import {ScrollView, Vibration, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {Actions} from "../../action/subject/SubjectRegisterActions";
import TypedTransition from "../../framework/routing/TypedTransition";
import AppHeader from "../common/AppHeader";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import SubjectRegisterViewsMixin from "./SubjectRegisterViewsMixin";
import {ObservationsHolder} from 'avni-models';
import General from "../../utility/General";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import _ from "lodash";
import SubjectRegisterView from "./SubjectRegisterView";
import CHSNavigator from "../../utility/CHSNavigator";
import {AvniAlert} from "../common/AvniAlert";
import {RejectionMessage} from "../approval/RejectionMessage";
import SummaryButton from "../common/SummaryButton";
import UserInfoService from "../../service/UserInfoService";
import Timer from "../common/Timer";
import BackgroundTimer from "react-native-background-timer";
import {WorkItem} from 'avni-models';

@Path('/SubjectRegisterFormView')
class SubjectRegisterFormView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "SubjectRegisterFormView";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.subject);
        this.scrollRef = React.createRef();
    }

    UNSAFE_componentWillMount() {
        const params = this.props.params;
        if (params.pageNumber) {
            this.dispatchAction(Actions.ON_LOAD,
                {
                    subjectUUID: params.subjectUUID,
                    workLists: params.workLists,
                    isDraftEntity: params.isDraftEntity,
                    pageNumber: params.pageNumber,
                    taskUuid: params.taskUuid,
                    onCompletion: (newState) => {
                        this.dispatchAction(Actions.USE_THIS_STATE, {state: newState});
                    }
                });
        }
        super.UNSAFE_componentWillMount();
    }

    getTitleForGroupSubject() {
        const currentWorkItem = this.state.workListState.workLists.getCurrentWorkItem();
        if (_.includes([WorkItem.type.HOUSEHOLD, WorkItem.type.ADD_MEMBER], currentWorkItem.type)) {
            const {headOfHousehold} = currentWorkItem.parameters;
            return headOfHousehold ? 'headOfHouseholdReg' : 'memberReg';
        }
    }

    getTitleForSubjectRegistration() {
        const currentWorkItem = this.state.workListState.workLists.getCurrentWorkItem();
        if (_.includes([WorkItem.type.REGISTRATION], currentWorkItem.type)) {
            const {name, subjectTypeName} = currentWorkItem.parameters;
            return name || subjectTypeName;
        }
    }

    get registrationType() {
        const workListName = _.get(this.state, 'workListState.workLists.currentWorkList.name');
        return this.getTitleForGroupSubject() || this.getTitleForSubjectRegistration() || workListName || `REG_DISPLAY-${this.state.subject.subjectType.name}`;
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
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [SubjectRegisterView, SubjectRegisterFormView]);
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
        const title = `${this.I18n.t(this.registrationType)} ${this.I18n.t('registration')}`;
        const subjectType = this.state.subject.subjectType;
        const userInfoService = this.context.getService(UserInfoService);
        const displayTimer = this.state.timerState && this.state.timerState.displayTimer(this.state.formElementGroup);
        return (
            <CHSContainer>
                <CHSContent>
                    <ScrollView ref={this.scrollRef}
                                keyboardShouldPersistTaps="handled">
                    <AppHeader title={title}
                               func={() => this.onAppHeaderBack(this.state.saveDrafts)} displayHomePressWarning={!this.state.saveDrafts}/>
                    {displayTimer ?
                            <Timer timerState={this.state.timerState} onStartTimer={() => this.onStartTimer()} group={this.state.formElementGroup}/> : null}
                        <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.state.subject.latestEntityApprovalStatus}/>
                        <View style={{flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                            <SummaryButton onPress={() => SubjectRegisterViewsMixin.summary(this)}/>
                        </View>
                        <View style={{backgroundColor: '#ffffff', flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                            {_.get(this.state, 'timerState.displayQuestions', true) &&
                              <FormElementGroup observationHolder={new ObservationsHolder(this.state.subject.observations)}
                                            group={this.state.formElementGroup}
                                            actions={Actions}
                                            filteredFormElements={this.state.filteredFormElements}
                                            validationResults={this.state.validationResults}
                                            formElementsUserState={this.state.formElementsUserState}
                                            dataEntryDate={this.state.subject.registrationDate}
                                              onValidationError={(x, y) => this.scrollToPosition(x, y)}
                                              groupAffiliation={this.state.groupAffiliation}
                                              syncRegistrationConcept1UUID={subjectType.syncRegistrationConcept1}
                                              syncRegistrationConcept2UUID={subjectType.syncRegistrationConcept2}
                                              allowedSyncConcept1Values={userInfoService.getSyncConcept1Values(subjectType)}
                                              allowedSyncConcept2Values={userInfoService.getSyncConcept2Values(subjectType)}
                            />}
                    {!displayTimer &&
                            <WizardButtons
                                previous={{
                                    func: () => this.previous(),
                                    label: this.I18n.t('previous')
                                }}
                                next={{
                                    func: () => SubjectRegisterViewsMixin.next(this),
                                    label: this.I18n.t('next')
                                }}
                            />}
                        </View>
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default SubjectRegisterFormView;
