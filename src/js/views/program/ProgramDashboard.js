import {View, Text, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {List, Button, ListItem} from "native-base";
import _ from "lodash";
import Separator from '../primitives/Separator';
import TypedTransition from "../../framework/routing/TypedTransition";
import ProgramEnrolmentsView from "./ProgramEnrolmentsView";
import moment from "moment";

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
            <View style={{flexDirection: 'column'}}>
                <Text>{this.props.summary.program.name}</Text>
                <View style={{flexDirection: 'row'}}>
                    {[{name: "openCases", count: this.props.summary.open},
                        {name: "upcomingCases", count: this.props.summary.upcoming},
                        {name: "overdueCases", count: this.props.summary.overdue},
                        {name: "totalCases", count: this.props.summary.total}
                    ].map((caseRecord) => {
                        return <View style={{flexDirection: 'column', flex: 0.25}}>
                            <Text>{this.I18n.t(caseRecord.name)}</Text>
                            <Text>{caseRecord.count}</Text>
                        </View>
                    })}
                </View>
                <Separator />
                <Text>{this.I18n.t('upcomingVisits')}</Text>
                <View style={{flexDirection: 'row'}}>
                    <Text style={{flex: 0.25}}>{this.I18n.t('scheduledDate')}</Text>
                    <Text style={{flex: 0.25}}>{this.I18n.t('name')}</Text>
                    <Text style={{flex: 0.25}}>{this.I18n.t('lowestAddressLevel')}</Text>
                    <Text style={{flex: 0.25}}>{this.I18n.t('lastVisitDate')}</Text>
                </View>
                <List primaryText={''} dataArray={this.props.summary.openEncounters} renderRow={(programEncounter) => this.renderRow(programEncounter)} />
                <View>
                    <Button onPress={() => TypedTransition.from(this).with({programUUID: this.props.summary.program.uuid}).to(ProgramEnrolmentsView)}>{this.I18n.t('viewAll')}</Button>
                </View>
            </View>
        );
    }
}

export default ProgramDashboard;