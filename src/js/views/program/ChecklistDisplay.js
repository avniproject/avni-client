import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import _ from "lodash";
import {Col, Grid, Row, Text} from "native-base";
import DGS from '../primitives/DynamicGlobalStyles';
import Colors from '../primitives/Colors';
import Fonts from '../primitives/Fonts';
import General from "../../utility/General";

class ChecklistDisplay extends AbstractComponent {
    static propTypes = {
        checklists: React.PropTypes.array.isRequired,
        style: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View style={this.appendedStyle()}>
                {this.props.checklists.map((checklist, checklistIndex) => <Grid style={DGS.observations.observationTable} key={`c${checklistIndex}`}>
                    <Row style={DGS.observations.observationRowHeader}>
                        <Col size={7}><Text style={[{fontSize: Fonts.Normal, textAlign: 'center'}, DGS.observations.observationColumn]}>{this.I18n.t('activity')}</Text></Col>
                        <Col size={3}><Text style={[{fontSize: Fonts.Normal, textAlign: 'center'}, DGS.observations.observationColumn]}>{this.I18n.t('due')}</Text></Col>
                    </Row>
                    {checklist.items.map((item, itemIndex) => {
                        return <Row style={DGS.observations.observationRow} key={`c${checklistIndex}-cli${itemIndex}`}>
                            <Col size={7} style={[DGS.observations.observationColumn, {paddingLeft: 5}]}>
                                <Text style={{fontSize: Fonts.Large}}>{this.I18n.t(item.concept.name)}</Text>
                            </Col>
                            <Col size={3} style={[DGS.observations.observationColumn, {paddingLeft: 5}]}>
                                <Text style={{textAlign: 'center', fontSize: Fonts.Large}}>{General.formatDate(item.dueDate)}</Text>
                            </Col>
                        </Row>
                    })}
                </Grid>)}
            </View>
        );
    }
}

export default ChecklistDisplay;