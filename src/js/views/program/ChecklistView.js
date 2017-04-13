import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ReducerKeys from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {Col, Container, Content, Grid, Row, Text} from "native-base";
import {ChecklistActions, ChecklistActionsNames as Actions} from "../../action/program/ChecklistActions";
import DatePicker from "../primitives/DatePicker";
import DGS from '../primitives/DynamicGlobalStyles';

@Path('/ChecklistView')
class ChecklistView extends AbstractComponent {
    static propTypes = {
        enrolmentUUID: React.PropTypes.string.isRequired
    };

    viewName() {
        return ChecklistView.name;
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.reducerKeys.checklist);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        return super.componentWillMount();
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <View style={{flexDirection: 'column'}}>
                        <AppHeader title={this.state.checklists[0].programEnrolment.individual.name}/>
                        <View style={{paddingHorizontal: 10}}>
                            {this.state.checklists.map((checklist, index) => {
                                return (<View style={{flexDirection: 'column'}} key={`checklist${index}`}>
                                    <Text style={{fontSize: 20}}>{checklist.name}</Text>
                                    <Grid style={DGS.observations.observationTable}>
                                        <Row style={DGS.observations.observationRowHeader}>
                                            <Col size={7}><Text style={{fontSize: 16}}>{this.I18n.t('activity')}</Text></Col>
                                            <Col size={3}><Text style={{fontSize: 16}}>{this.I18n.t('completedOn')}</Text></Col>
                                        </Row>
                                        {checklist.items.map((item, itemIndex) => {
                                            const actionObject = {checklistName: checklist.name, checklistItemName: item.concept.name};
                                            return <Row style={DGS.observations.observationRow} key={`checklistItem${itemIndex}`}>
                                                <Col size={7} style={DGS.observations.observationColumn}>
                                                    <Text style={{flex: 0.7}}>{item.displayTitle(this.I18n)}</Text>
                                                </Col>
                                                <Col size={3} style={DGS.observations.observationColumn}>
                                                    <DatePicker actionName={Actions.ON_CHECKLIST_ITEM_COMPLETION_DATE_CHANGE}
                                                                validationResult={ChecklistActions.getValidationResult(index, item.concept.name, this.state)}
                                                                dateValue={item.completionDate} actionObject={actionObject}/>
                                                </Col>
                                            </Row>
                                        })}
                                    </Grid>
                                </View>);
                            })}
                        </View>
                    </View>
                </Content>
            </Container>
        );
    }
}

export default ChecklistView;