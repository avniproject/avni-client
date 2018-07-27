import {View, ToastAndroid, Alert, BackAndroid} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ReducerKeys from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {Button, Text} from "native-base";
import {ChecklistActions, ChecklistActionsNames as Actions} from "../../action/program/ChecklistActions";
import DGS from "../primitives/DynamicGlobalStyles";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
import Fonts from "../primitives/Fonts";
import {Duration} from "openchs-models";
import ChecklistItemDisplay from "./ChecklistItemDisplay";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import TypedTransition from "../../framework/routing/TypedTransition";
import Styles from "../primitives/Styles";
import ChecklistDisplay from "./ChecklistDisplay";

@Path('/ChecklistView')
class ChecklistView extends AbstractComponent {
    static propTypes = {
        enrolmentUUID: React.PropTypes.string.isRequired
    };

    viewName() {
        return 'ChecklistView';
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.reducerKeys.checklist);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        this.backFunction = () => this.goBack();
        BackAndroid.addEventListener('hardwareBackPress', this.backFunction);
        return super.componentWillMount();
    }

    showToast() {
        if (this.state.showSavedToast) {
            ToastAndroid.showWithGravity("Saved successfully", ToastAndroid.SHORT, ToastAndroid.TOP);
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        BackAndroid.removeEventListener('hardwareBackPress', this.backFunction);
    }

    save() {
        this.dispatchAction(Actions.SAVE);
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

    render() {
        General.logDebug('ChecklistView', this.props.enrolmentUUID);
        const checklists = this.state.checklists.map((checklist, idx) => <ChecklistDisplay key={idx}
                                                                                           onSave={this.save.bind(this)}
                                                                                           data={checklist}/>);
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.BlackBackground}}>
                <CHSContent>
                    {this.showToast()}
                    <AppHeader func={() => this.goBack()}
                               title={`${this.state.checklists[0].programEnrolment.individual.nameString} - ${this.I18n.t('checklists')}`}/>
                    {checklists}
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default ChecklistView;