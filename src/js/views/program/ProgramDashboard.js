import {View, Text, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {List, Button, ListItem, Card} from "native-base";
import _ from "lodash";
import Separator from '../primitives/Separator';
import TypedTransition from "../../framework/routing/TypedTransition";
import ProgramEnrolmentsView from "./ProgramEnrolmentsView";
import moment from "moment";
import DGS from '../primitives/DynamicGlobalStyles';
import Colors from '../primitives/Colors';
import Fonts from '../primitives/Fonts';

class ProgramDashboard extends AbstractComponent {
    static propTypes = {
        summary: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    renderRow(programEncounter) {
        const lastFulfilledEncounter = programEncounter.programEnrolment.lastFulfilledEncounter;
        return (<ListItem style={{flexDirection: 'row'}}>
            <Text style={{flex: 0.25}}>{moment(programEncounter.scheduledDateTime).format('DD-MM-YYYY')}</Text>
            <Text style={{flex: 0.25}}>{programEncounter.programEnrolment.individual.name}</Text>
            <Text style={{flex: 0.25}}>{programEncounter.programEnrolment.individual.lowestAddressLevel.name}</Text>
            <Text style={{flex: 0.25}}>{_.isNil(lastFulfilledEncounter) ? '' : lastFulfilledEncounter.actualDateTime}</Text>
        </ListItem>);
    }

    render() {
        return (
            <View style={{flexDirection: 'column', marginHorizontal: DGS.resizeWidth(12), marginTop: DGS.resizeHeight(14), borderRadius: 5}}>
                <Card style={DGS.card.self}>
                    <Text style={DGS.card.title}>{this.props.summary.program.name}</Text>
                    <View style={{flexDirection: 'row'}}>
                        {[{name: "openCases", count: this.props.summary.open},
                            {name: "upcomingCases", count: this.props.summary.upcoming},
                            {name: "overdueCases", count: this.props.summary.overdue},
                            {name: "totalCases", count: this.props.summary.total}
                        ].map((caseRecord) => {
                            return <View style={[{flexDirection: 'column', flex: 0.25}, DGS.card.aggregate.self]}>
                                <Text style={DGS.card.aggregate.label}>{this.I18n.t(caseRecord.name)}</Text>
                                <Text style={DGS.card.aggregate.value}>{caseRecord.count}</Text>
                            </View>
                        })}
                    </View>
                    <View style={DGS.card.separator}>
                        <Separator/>
                    </View>
                    <Text style={DGS.card.table.title}>{this.I18n.t('upcomingVisits')}</Text>
                    <View style={{flexDirection: 'row', marginTop: DGS.resizeHeight(26)}}>
                        {this.getTableHeaderCell('scheduledDate')}
                        {this.getTableHeaderCell('name')}
                        {this.getTableHeaderCell('lowestAddressLevel')}
                        {this.getTableHeaderCell('lastVisitDate')}
                    </View>
                    <View style={{marginTop: DGS.resizeHeight(17.8)}}>
                        <Separator/>
                    </View>
                    {this.props.summary.openEncounters.length === 0 ?
                        <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                            <Text>{this.I18n.t('noOpenEncounters')}</Text>
                        </View>
                        :
                        <List primaryText={''} dataArray={this.props.summary.openEncounters} renderRow={(programEncounter) => this.renderRow(programEncounter)}/>
                    }
                    <View style={DGS.card.action.self}>
                        <Text style={DGS.card.action.button}
                              onPress={() => TypedTransition.from(this).with({programUUID: this.props.summary.program.uuid}).to(ProgramEnrolmentsView)}>{this.I18n.t('viewAll')}</Text>
                    </View>
                </Card>
            </View>
        );
    }

    getTableHeaderCell(messageKey) {
        return <Text style={{flex: 0.25, color: Colors.InputNormal, fontSize: Fonts.Normal}}>{this.I18n.t(messageKey)}</Text>;
    }
}

export default ProgramDashboard;