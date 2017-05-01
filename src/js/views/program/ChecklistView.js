import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ReducerKeys from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {Button, Card, Col, Container, Content, Grid, Row, Text} from "native-base";
import {ChecklistActions, ChecklistActionsNames as Actions} from "../../action/program/ChecklistActions";
import DatePicker from "../primitives/DatePicker";
import DGS from '../primitives/DynamicGlobalStyles';
import Colors from '../primitives/Colors';
import Distances from '../primitives/Distances';
import Fonts from '../primitives/Fonts';
import Duration from "../../models/Duration";
import ChecklistItemDisplay from "./ChecklistItemDisplay";

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
        return super.componentWillMount();
    }

    save() {
        this.dispatchAction(Actions.SAVE);
    }

    render() {
        return (
            <Container theme={themes} style={{backgroundColor: Colors.BlackBackground}}>
                <Content>
                    <AppHeader title={`${this.state.checklists[0].programEnrolment.individual.name} - ${this.I18n.t('checklists')}`}/>
                    <View style={{paddingHorizontal: DGS.resizeWidth(Distances.ContentDistanceFromEdge)}}>
                        {this.state.checklists.map((checklist, index) => {
                            return (
                                <Card style={{borderRadius: 5, flexDirection: 'column', paddingHorizontal: DGS.resizeWidth(13)}} key={`c${index}`}>
                                    <Text style={{fontSize: Fonts.Large}}>{checklist.name}</Text>
                                    {checklist.groupedItems().map((itemGroup, itemGroupIndex) => {
                                        const duration = Duration.durationBetween(checklist.baseDate, itemGroup[0].dueDate);
                                        return <View key={`c${index}-clig${itemGroupIndex}`}>
                                            <Text style={{fontSize: Fonts.Medium}}>{duration.toString(this.I18n)}</Text>
                                            <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
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
                                </Card>);
                        })}
                    </View>
                    <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
                        <Button primary style={{flex: 0.3}} onPress={() => {
                            this.save()
                        }}>{this.I18n.t('save')}</Button>
                    </View>
                </Content>
            </Container>
        );
    }
}

export default ChecklistView;