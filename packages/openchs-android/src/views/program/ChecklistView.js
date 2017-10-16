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
        BackAndroid.removeEventListener('hardwareBackPress', this.backFunction);
    }

    save() {
        this.dispatchAction(Actions.SAVE);
    }

    goBack() {
        if (this.state.promptForSave) {
            Alert.alert("Unsaved Changes", "Exit without saving? ", [
                {
                    text: this.I18n.t('yes'), onPress: () => {
                    TypedTransition.from(this).goBack();
                }
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
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
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.BlackBackground}}>
                <CHSContent>
                    {this.showToast()}
                    <AppHeader func={() => this.goBack()} title={`${this.state.checklists[0].programEnrolment.individual.name} - ${this.I18n.t('checklists')}`}/>
                    {this.state.checklists.map((checklist, index) => {
                        return (
                            <View style={{
                                marginHorizontal: DGS.resizeWidth(Distances.ContentDistanceFromEdge),
                                backgroundColor: Styles.whiteColor,
                                borderRadius: 5,
                                flexDirection: 'column',
                                flexWrap: "nowrap",
                                paddingHorizontal: DGS.resizeWidth(13)
                            }} key={`c${index}`}>
                                <Text style={{fontSize: Fonts.Large}}>{checklist.name}</Text>
                                {checklist.groupedItems().map((itemGroup, itemGroupIndex) => {
                                    const duration = Duration.durationBetween(checklist.baseDate, itemGroup[0].dueDate);
                                    return <View key={`c${index}-clig${itemGroupIndex}`} style={{marginTop: DGS.resizeHeight(10)}}>
                                        <Text style={{fontSize: Fonts.Medium}}>{duration.toString(this.I18n)}</Text>
                                        <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-start'}}>
                                            {itemGroup.map((checklistItem, checklistItemIndex) => {
                                                const actionObject = {checklistName: checklist.name, checklistItemName: checklistItem.concept.name};
                                                return <ChecklistItemDisplay checklistItem={checklistItem}
                                                                             key={`c${index}-clig${itemGroupIndex}-cli${checklistItemIndex}`}
                                                                             completionDateAction={Actions.ON_CHECKLIST_ITEM_COMPLETION_DATE_CHANGE}
                                                                             validationResult={ChecklistActions.getValidationResult(index, checklistItem.concept.name, this.state)}
                                                                             actionObject={actionObject}
                                                />
                                            })}
                                        </View>
                                    </View>
                                })}
                                <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginVertical: DGS.resizeHeight(10)}}>
                                    <Button primary style={{flex: 0.3}} onPress={() => {
                                        this.save()
                                    }}>{this.I18n.t('save')}</Button>
                                </View>
                            </View>);
                    })}
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default ChecklistView;