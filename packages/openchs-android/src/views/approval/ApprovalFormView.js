import React from 'react';
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {ApprovalFormActionNames as Actions} from "../../action/approval/ApprovalFormActions";
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
import TypedTransition from "../../framework/routing/TypedTransition";

/**
 * Renders the mapped Approval or Rejection form (avniproject/avni-client#2091).
 *
 * Modelled on TaskFormView, so question groups, skip logic and validation behave as they do on any other
 * Avni form - FormElementGroup and AbstractDataEntryState are the whole mechanism, and no new renderer is
 * introduced. Whether the form can be submitted with nothing filled in is the organisation's choice,
 * expressed through its own mandatory questions; there is deliberately no equivalent of the comment box's
 * refusal to accept an empty comment.
 */
@Path('/approvalFormView')
class ApprovalFormView extends AbstractComponent {
    static propTypes = {
        entity: PropTypes.object.isRequired,
        schema: PropTypes.string.isRequired,
        form: PropTypes.object,
        status: PropTypes.string.isRequired,
        title: PropTypes.string
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.approvalForm);
        this.scrollRef = React.createRef();
    }

    viewName() {
        return 'ApprovalFormView';
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_FORM_LOAD, this.props);
        super.UNSAFE_componentWillMount();
    }

    next() {
        this.dispatchAction(Actions.ON_NEXT, {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits) => {
                const onSaveCallback = (source) => TypedTransition.from(source).popToBookmark();
                const headerMessage = `${this.I18n.t(this.props.title || 'approval')} - ${this.I18n.t('summaryAndRecommendations')}`;
                CHSNavigator.navigateToSystemsRecommendationView(this, decisions, ruleValidationErrors, null,
                    state.getEntity().observations, Actions.ON_SAVE, onSaveCallback, headerMessage, checklists,
                    nextScheduledVisits, this.props.form);
            },
            movedNext: this.scrollToTop
        });
    }

    previous() {
        this.state.wizard.isFirstPage() ? this.goBack() : this.dispatchAction(Actions.ON_PREVIOUS, {cb: this.scrollToTop});
    }

    /**
     * Backing out must leave the record's approval status unchanged. Nothing is written before ON_SAVE, so
     * this only has to warn and navigate away - there is no partial row to undo.
     */
    onAppHeaderBack() {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [ApprovalFormView]);
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    render() {
        General.logDebug(this.viewName(), 'Render');
        const title = this.I18n.t(this.props.title || 'approval');
        return (
            <CHSContainer>
                <CHSContent>
                    <ScrollView ref={this.scrollRef} keyboardShouldPersistTaps="handled">
                        <AppHeader title={title} func={() => this.onAppHeaderBack()} displayHomePressWarning={true}/>
                        <View style={{backgroundColor: '#ffffff', flexDirection: 'column'}}>
                            <FormElementGroup group={this.state.formElementGroup}
                                              observationHolder={new ObservationsHolder(this.state.getEntity().observations)}
                                              actions={Actions}
                                              validationResults={this.state.validationResults}
                                              filteredFormElements={this.state.filteredFormElements}
                                              formElementsUserState={this.state.formElementsUserState}
                                              dataEntryDate={this.state.getEntity().statusDateTime}
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

export default ApprovalFormView;
