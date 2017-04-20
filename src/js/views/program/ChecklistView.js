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
import Fonts from '../primitives/Fonts';

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
            <Container theme={themes} style={{backgroundColor: Colors.GreyBackground}}>
                <Content>
                    <View style={{flexDirection: 'column'}}>
                        <AppHeader title={this.state.checklists[0].programEnrolment.individual.name}/>
                        <View style={{paddingHorizontal: 10}}>
                            {this.state.checklists.map((checklist, index) => {
                                return (
                                    <Card style={{borderRadius: 5, flexDirection: 'column'}} key={`checklist${index}`}>
                                        <Text style={{fontSize: 20}}>{checklist.name}</Text>
                                        <Grid style={DGS.observations.observationTable}>
                                            <Row style={DGS.observations.observationRowHeader}>
                                                <Col size={7}><Text style={{fontSize: Fonts.Large}}>{this.I18n.t('activity')}</Text></Col>
                                                <Col size={3}><Text style={{fontSize: Fonts.Large}}>{this.I18n.t('completedOn')}</Text></Col>
                                            </Row>
                                            {checklist.items.map((item, itemIndex) => {
                                                const actionObject = {checklistName: checklist.name, checklistItemName: item.concept.name};
                                                return <Row style={DGS.observations.observationRow} key={`checklistItem${itemIndex}`}>
                                                    <Col size={7} style={[DGS.observations.observationColumn, {paddingLeft: 5}]}>
                                                        <Text style={{flex: 0.7}}>{item.displayTitle(this.I18n)}</Text>
                                                    </Col>
                                                    <Col size={3} style={DGS.observations.observationColumn}>
                                                        <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                                                            <DatePicker actionName={Actions.ON_CHECKLIST_ITEM_COMPLETION_DATE_CHANGE}
                                                                        validationResult={ChecklistActions.getValidationResult(index, item.concept.name, this.state)}
                                                                        dateValue={item.completionDate} actionObject={actionObject}
                                                                        noDateMessageKey={'notCompleted'}
                                                            />
                                                        </View>
                                                    </Col>
                                                </Row>
                                            })}
                                        </Grid>
                                    </Card>);
                            })}
                        </View>
                        <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
                            <Button primary style={{flex: 0.3}} onPress={() => {this.save()}}>{this.I18n.t('save')}</Button>
                        </View>
                    </View>
                </Content>
            </Container>
        );
    }
}

export default ChecklistView;