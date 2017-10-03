import {View, Modal, Button, Dimensions, TouchableOpacity, TouchableNativeFeedback, Text} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import EntityTypeChoiceState from "../../action/common/EntityTypeChoiceState";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import _ from "lodash";
import Styles from "../primitives/Styles";

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
        if (_.isNil(this.props.selectedEntityType)) return;

        this.dispatchAction(this.props.actions['ENTITY_TYPE_SELECTION_CONFIRMED'], {
            cb: (newState) => this.props.onEntityTypeSelectionConfirmed(newState)
        });
    }

    cancelSelection() {
        this.dispatchAction(this.props.actions['CANCELLED_ENTITY_TYPE_SELECTION']);
    }

    renderButton(onPress, key) {
        return <TouchableNativeFeedback onPress={onPress} background={TouchableNativeFeedback.SelectableBackground()}>
            <View style={{paddingHorizontal: 8, paddingVertical: 8, marginHorizontal: 8}}>
                <Text style={{color: Styles.accentColor, fontSize: 16}}>{this.I18n.t(key).toUpperCase()}</Text>
            </View>
        </TouchableNativeFeedback>
    }

    render() {
        const {width, height} = Dimensions.get('window');
        return (
            <Modal
                animationType={"fade"}
                transparent={true}
                visible={[EntityTypeChoiceState.states.Launched, EntityTypeChoiceState.states.EntityTypeSelected].includes(this.props.flowState)}
                onRequestClose={() => {
                    this.cancelSelection();
                    return true;
                }}>
                <View
                    style={{
                        flex: 1,
                        flexDirection: 'column',
                        flexWrap: 'nowrap',
                        backgroundColor: "rgba(0, 0, 0, 0.5)"
                    }}>
                    <View style={{flex: .3}}/>
                    <View style={[{
                        width: width * 0.7,
                        flexDirection: 'column',
                        flexWrap: 'nowrap',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: 20,
                        alignSelf: 'center',
                        backgroundColor: Styles.whiteColor
                    }]}>
                        <RadioGroup
                            style={{alignSelf: 'stretch'}}
                            action={this.props.actions['ENTITY_TYPE_SELECTED']}
                            selectionFn={(entityType) => _.isNil(this.props.selectedEntityType) ? false : this.props.selectedEntityType.uuid === entityType.uuid}
                            labelKey={this.props.labelKey}
                            labelValuePairs={this.props.entityTypes.map((entityType) => new RadioLabelValue(entityType.name, entityType))}/>
                        <View style={{flexDirection: 'row', alignSelf: 'flex-end', marginTop: 10}}>
                            {this.renderButton(() => this.cancelSelection(), 'cancel')}
                            {this.renderButton(() => this.entityTypeSelectionConfirmed(), 'proceed')}
                        </View>
                    </View>
                    <View style={{flex: 1}}/>
                </View>
            </Modal>
        );
    }
}

export default EntityTypeSelector;