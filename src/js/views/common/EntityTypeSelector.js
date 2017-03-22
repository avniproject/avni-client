import {View, StyleSheet, Modal} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import EntityTypeChoiceState from "../../action/common/EntityTypeChoiceState";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import themes from "../primitives/themes";
import CHSNavigator from "../../utility/CHSNavigator";
import {Button, Content, Grid, Row, Container} from "native-base";
import _ from 'lodash';

class EntityTypeSelector extends AbstractComponent {
    static propTypes = {
        flowState: React.PropTypes.number.isRequired,
        entityTypes: React.PropTypes.array.isRequired,
        selectedEntityType: React.PropTypes.object,
        actions: React.PropTypes.object.isRequired,
        labelKey: React.PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    entityTypeSelectionConfirmed() {
        this.dispatchAction(this.props.actions['ENTITY_TYPE_SELECTION_CONFIRMED'], {
            cb: (newState) => CHSNavigator.navigateToProgramEnrolmentView(this, newState.entity)
        })
    }

    render() {
        return (
            <Modal
                animationType={"slide"}
                transparent={true}
                visible={[EntityTypeChoiceState.states.Launched, EntityTypeChoiceState.states.EntityTypeSelected].includes(this.props.flowState)}
                onRequestClose={() => {
                }}>
                <Container theme={themes}>
                    <Content contentContainerStyle={{marginTop: 100}}>
                        <Grid>
                            <Row style={{backgroundColor: '#fff'}}>
                                <RadioGroup action={this.props.actions['ENTITY_TYPE_SELECTED']}
                                            selectionFn={(entityType) => _.isNil(this.props.selectedEntityType) ? false : this.props.selectedEntityType.uuid === entityType.uuid}
                                            labelKey={this.props.labelKey}
                                            labelValuePairs={this.props.entityTypes.map((entityType) => new RadioLabelValue(entityType.name, entityType))}/>
                            </Row>
                            <Row style={{backgroundColor: '#fff'}}>
                                <Button onPress={() => this.entityTypeSelectionConfirmed()}>{this.I18n.t('proceed')}</Button>
                                <Button onPress={() => this.dispatchAction(this.props.actions['CANCELLED_ENTITY_TYPE_SELECTION'])}>{this.I18n.t('cancel')}</Button>
                            </Row>
                        </Grid>
                    </Content>
                </Container>
            </Modal>
        );
    }
}

export default EntityTypeSelector;