import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import _ from "lodash";
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input, Radio
} from "native-base";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';

class Observations extends AbstractComponent {
    static propTypes = {
        observations: React.PropTypes.array.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const observationRows = _.chunk(this.props.observations, DynamicGlobalStyles.numberOfRows(this.props.observations.length));
        return (
            <Grid>
                {
                    observationRows.map((observationRow) => {
                        return (
                            <Row>{observationRow.map((observation) => {
                                return (
                                    <Column>
                                        <Text></Text>
                                    </Column>
                                );
                            })}</Row>)
                    })
                }
            </Grid>
        );
    }
}

export default Observations;