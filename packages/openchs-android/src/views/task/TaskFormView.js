import React from 'react';
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {TaskActionNames as Actions} from "../../action/task/TaskActions";
import Reducers from "../../reducer";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import {ScrollView, View} from "react-native";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import CHSNavigator from "../../utility/CHSNavigator";
import {AvniAlert} from "../common/AvniAlert";
import {ObservationsHolder} from 'avni-models';
import FormMappingService from "../../service/FormMappingService";
import TypedTransition from "../../framework/routing/TypedTransition";


@Path('/taskFormView')
class TaskFormView extends AbstractComponent {
    static propTypes = {
        taskUUID: PropTypes.string.isRequired,
        statusUUID: PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.task);
        this.scrollRef = React.createRef();
    }

    viewName() {
        return 'TaskFormView';
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_FORM_LOAD, this.props);
        super.UNSAFE_componentWillMount();
    }

    next() {
        this.dispatchAction(Actions.ON_NEXT, {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits) => {
                const onSaveCallback = (source) => TypedTransition.from(source).popToBookmark();
                const headerMessage = `${this.I18n.t(state.task.name)} - ${this.I18n.t('summaryAndRecommendations')}`;
                const formMappingService = this.context.getService(FormMappingService);
                const formMapping = formMappingService.getTaskFormMapping(state.task.taskType);
                const form = _.get(formMapping, 'form');
                CHSNavigator.navigateToSystemsRecommendationView(this, decisions, ruleValidationErrors, null, state.task.observations, Actions.ON_SAVE, onSaveCallback, headerMessage, checklists, nextScheduledVisits, form);
            },
            movedNext: this.scrollToTop
        });
    }

    previous() {
        this.state.wizard.isFirstPage() ? this.goBack() : this.dispatchAction(Actions.ON_PREVIOUS, {cb: this.scrollToTop});
    }

    onAppHeaderBack() {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [TaskFormView]);
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    render() {
        General.logDebug(this.viewName(), 'Render');
        const title = `${this.I18n.t(this.state.task.name)}`;
        return (
            <CHSContainer>
                <CHSContent>
                    <ScrollView ref={this.scrollRef} keyboardShouldPersistTaps="handled">
                    <AppHeader title={title} func={() => this.onAppHeaderBack()} displayHomePressWarning={true}/>
                    <View style={{backgroundColor: '#ffffff', flexDirection: 'column'}}>
                        <FormElementGroup group={this.state.formElementGroup}
                                          observationHolder={new ObservationsHolder(this.state.task.observations)}
                                          actions={Actions}
                                          validationResults={this.state.validationResults}
                                          filteredFormElements={this.state.filteredFormElements}
                                          formElementsUserState={this.state.formElementsUserState}
                                          dataEntryDate={this.state.task.completedOn}
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
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default TaskFormView;

