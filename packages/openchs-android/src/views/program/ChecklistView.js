import {ToastAndroid, Alert, BackHandler, ScrollView} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ReducerKeys from "../../reducer";
import AppHeader from "../common/AppHeader";
import {ChecklistActionsNames as Actions} from "../../action/program/ChecklistActions";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import TypedTransition from "../../framework/routing/TypedTransition";
import ChecklistDisplay from "./ChecklistDisplay";
import CHSNavigator from "../../utility/CHSNavigator";
import AvniToast from "../common/AvniToast";

@Path('/ChecklistView')
class ChecklistView extends AbstractComponent {
    static propTypes = {
        enrolmentUUID: PropTypes.string.isRequired
    };

    viewName() {
        return 'ChecklistView';
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.reducerKeys.checklist);
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        this.backFunction = () => this.goBack();
        BackHandler.addEventListener('backPress', this.backFunction);
        return super.UNSAFE_componentWillMount();
    }

    showToast() {
        if (this.state.showSavedToast) {
            ToastAndroid.showWithGravity("Saved successfully", ToastAndroid.SHORT, ToastAndroid.TOP);
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        BackHandler.removeEventListener('backPress', this.backFunction);
    }

    goBack() {
        if (this.state.promptForSave) {
            Alert.alert("Unsaved Changes", "Do you want to save before exiting? ", [
                {
                    text: this.I18n.t('yes'), onPress: () => {
                    }
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
                        TypedTransition.from(this).goBack();
                    }
                }
            ]);
            return true;
        } else {
            TypedTransition.from(this).goBack();
            return true;
        }
    }

    onChecklistItemEdit(checklistItem) {
        this.dispatchAction(Actions.ON_CHECKLIST_ITEM_EDIT, {
            checklistItem,
            onContinueChecklistItemEdit: () => CHSNavigator.navigateToChecklistItemView(this, checklistItem)
        });
    }

    render() {
        General.logDebug('ChecklistView', this.props.enrolmentUUID);
        const checklists = this.state.checklists.map((checklist, idx) => <ChecklistDisplay key={idx}
                                                                                           data={checklist} i18n={this.I18n}
                                                                                           reloadCallback={() => this.dispatchAction(Actions.ON_LOAD, this.props)}
                                                                                           onChecklistItemEdit={(checklistItem) => this.onChecklistItemEdit(checklistItem)}/>);
        return (
            <CHSContainer style={{backgroundColor: Colors.BlackBackground}}>
                <CHSContent>
                    {this.showToast()}
                    <AppHeader func={() => this.goBack()}
                               title={`${this.state.individual.nameString} - ${this.I18n.t('checklists')}`}/>
                    <ScrollView>
                        {checklists}
                    </ScrollView>
                    {this.state.editFormRuleResponse.isDisallowed() &&
                        <AvniToast message={this.I18n.t(this.state.editFormRuleResponse.getMessage())} onAutoClose={() => this.dispatchAction(Actions.ON_CHECKLIST_ITEM_EDIT_ERROR_SHOWN)}/>}
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default ChecklistView;
