import {View, StyleSheet, Modal} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import EntityTypeChoiceState from "../../action/common/EntityTypeChoiceState";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import themes from "../primitives/themes";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import {Button, Content, Grid, Row, Container} from "native-base";
import _ from "lodash";

class EntityTypeSelector extends AbstractComponent {
    static propTypes = {
        flowState: React.PropTypes.number.isRequired,
        entityTypes: React.PropTypes.array.isRequired,
        selectedEntityType: React.PropTypes.object,
        actions: React.PropTypes.object.isRequired,
        labelKey: React.PropTypes.string.isRequired,
        onEntityTypeSelectionConfirmed: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    entityTypeSelectionConfirmed() {
        this.dispatchAction(this.props.actions['ENTITY_TYPE_SELECTION_CONFIRMED'], {
            cb: (newState) => this.props.onEntityTypeSelectionConfirmed(newState)
        });
    }

    render() {
        var modalBackgroundStyle = {
            backgroundColor: [EntityTypeChoiceState.states.Launched, EntityTypeChoiceState.states.EntityTypeSelected].includes(this.props.flowState) ? 'rgba(0, 0, 0, 0.5)' : 'white'
        };
        return (
            <Modal
                animationType={"slide"}
                transparent={true}
                visible={[EntityTypeChoiceState.states.Launched, EntityTypeChoiceState.states.EntityTypeSelected].includes(this.props.flowState)}
                onRequestClose={() => {
                }}>
                <View
                    style={{flex: 1, flexDirection: 'column', flexWrap: 'nowrap', backgroundColor: "rgba(0, 0, 0, 0.5)"}}>
                    <View style={{flex: .3}}/>
                    <View style={[{
                        flex: .2,
                        width: DynamicGlobalStyles.resizeWidth(300),
                        flexDirection: 'column',
                        flexWrap: 'nowrap',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: 20,
                        alignSelf: 'center',
                        backgroundColor: 'white'
                    }]}>
                        <View>
                            <RadioGroup action={this.props.actions['ENTITY_TYPE_SELECTED']}
                                        selectionFn={(entityType) => _.isNil(this.props.selectedEntityType) ? false : this.props.selectedEntityType.uuid === entityType.uuid}
                                        labelKey={this.props.labelKey}
                                        labelValuePairs={this.props.entityTypes.map((entityType) => new RadioLabelValue(entityType.name, entityType))}/>
                        </View>
                        <View style={{flex: 1, flexDirection: 'row', alignSelf: 'flex-end'}}>
                                <Button onPress={() => this.dispatchAction(this.props.actions['CANCELLED_ENTITY_TYPE_SELECTION'])}>{this.I18n.t('cancel')}</Button>
                                <Button style={{marginLeft: 8}} onPress={() => this.entityTypeSelectionConfirmed()}>{this.I18n.t('proceed')}</Button>
                        </View>
                    </View>
                    <View style={{flex: .5}}/>
                </View>
            </Modal>
        );
    }
}

export default EntityTypeSelector;