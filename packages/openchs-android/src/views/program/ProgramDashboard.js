import {View, Text, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Card} from "native-base";
import Separator from "../primitives/Separator";
import TypedTransition from "../../framework/routing/TypedTransition";
import ProgramEnrolmentsView from "./ProgramEnrolmentsView";
import DGS from "../primitives/DynamicGlobalStyles";
import moment from "moment";
import _ from 'lodash';
import TabularListView from '../common/TabularListView';
import CHSNavigator from '../../utility/CHSNavigator';

class ProgramDashboard extends AbstractComponent {
    static propTypes = {
        summary: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    static displayItemsForProgramEncounters(programEncounter) {
        const displayItems = [];
        displayItems.push(moment(programEncounter.scheduledDateTime).format('DD-MM-YYYY'));
        displayItems.push(programEncounter.programEnrolment.individual.name);
        displayItems.push(programEncounter.programEnrolment.individual.lowestAddressLevel.name);
        const lastFulfilledEncounter = programEncounter.programEnrolment.lastFulfilledEncounter;
        displayItems.push(_.isNil(lastFulfilledEncounter) ? '' : lastFulfilledEncounter.encounterDateTime.name);
        return displayItems;
    }

    render() {
        return (
            <View style={{flexDirection: 'column'}}>
                <Card style={DGS.card.self}>
                    <Text style={DGS.card.title}>{this.props.summary.program.name}</Text>
                    <View style={{flexDirection: 'row'}}>
                        {[{name: "openCases", count: this.props.summary.open},
                            {name: "upcomingCases", count: this.props.summary.upcoming},
                            {name: "overdueCases", count: this.props.summary.overdue},
                            {name: "totalCases", count: this.props.summary.total}
                        ].map((caseRecord, index) => {
                            return <View style={[{flexDirection: 'column', flex: 0.25}, DGS.card.aggregate.self]} key={`programCaseCount${index}`}>
                                <Text style={DGS.card.aggregate.label}>{this.I18n.t(caseRecord.name)}</Text>
                                <Text style={DGS.card.aggregate.value}>{caseRecord.count}</Text>
                            </View>
                        })}
                    </View>
                    <View style={DGS.card.separator}>
                        <Separator/>
                    </View>
                    <TabularListView data={this.props.summary.openEncounters}
                                     headerTitleKeys={['scheduledDate', 'name', 'lowestAddressLevel', 'lastVisitDate']}
                                     tableTitle={this.I18n.t('upcomingVisits')}
                                     handleClick={(programEncounter) => CHSNavigator.navigateToProgramEnrolmentDashboardView(this, programEncounter.programEnrolment.individual.uuid, programEncounter.programEnrolment.uuid)}
                                     getRow={ProgramDashboard.displayItemsForProgramEncounters}
                                     emptyTableMessage={this.I18n.t('noOpenEncounters')}
                    />
                    <View style={DGS.card.action.self}>
                        <Text style={DGS.card.action.button}
                              onPress={() => TypedTransition.from(this).with({programUUID: this.props.summary.program.uuid}).to(ProgramEnrolmentsView)}>{this.I18n.t('viewAll')}</Text>
                    </View>
                </Card>
            </View>
        );
    }
}

export default ProgramDashboard;