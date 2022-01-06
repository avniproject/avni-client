import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from 'prop-types';
import FormMappingService from "../../service/FormMappingService";
import Icon from 'react-native-vector-icons/SimpleLineIcons'
import {View, TouchableOpacity} from "react-native";
import ObservationsSectionOptions from "./ObservationsSectionOptions";
import Observations from "./Observations";
import _ from "lodash";
import CHSNavigator from "../../utility/CHSNavigator";

class CollapsibleEncounters extends AbstractComponent {

    static propTypes = {
        encountersInfo: PropTypes.any.isRequired,
        onToggleAction: PropTypes.string.isRequired,
        renderTitleAndDetails: PropTypes.func.isRequired,
        encounterActions: PropTypes.func.isRequired,
        cancelVisitAction: PropTypes.func.isRequired,
        style: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    editEncounterByFEG(pageNumber) {
        const encounter = this.props.encountersInfo.encounter.cloneForEdit();
        const editing = !encounter.isScheduled();
        encounter.encounterDateTime = _.isNil(encounter.encounterDateTime) ? new Date() : encounter.encounterDateTime;
        CHSNavigator.navigateToEncounterView(this, {encounter, editing, pageNumber});
    }

    render() {
        const formMappingService = this.context.getService(FormMappingService);
        const encounterInfo = this.props.encountersInfo;
        const isCancelled = !_.isNil(encounterInfo.encounter.cancelDateTime);
        const formType = isCancelled ? this.props.cancelFormType : this.props.formType;
        return (
            <View style={this.appendedStyle(this.props.style)}>
                <TouchableOpacity onPress={() => this.dispatchAction(this.props.onToggleAction, {
                    encounterInfo: {...encounterInfo, expand: !encounterInfo.expand}
                })}>
                    {this.props.renderTitleAndDetails()}
                    <View style={{right: 2, position: 'absolute', alignSelf: 'center'}}>
                        {encounterInfo.expand === false ?
                            <Icon name={'arrow-down'} size={12}/> :
                            <Icon name={'arrow-up'} size={12}/>}
                    </View>
                </TouchableOpacity>
                {encounterInfo.expand === true ?
                    <View>
                        <Observations
                            form={formMappingService.findFormForEncounterType(encounterInfo.encounter.encounterType, formType, encounterInfo.encounter.subjectType)}
                            observations={encounterInfo.encounter.getObservations()}
                            quickFormEdit={true}
                            onFormElementGroupEdit={(pageNumber) => this.editEncounterByFEG(pageNumber)}
                        />
                    </View> : <View/>}
                <TouchableOpacity onPress={() => this.dispatchAction(this.props.onToggleAction, {
                    encounterInfo: {...encounterInfo, expand: !encounterInfo.expand}
                })}>
                    <ObservationsSectionOptions contextActions={this.props.encounterActions()}
                                                primaryAction={this.props.cancelVisitAction()}/>
                </TouchableOpacity>
            </View>
        );
    }
}

export default CollapsibleEncounters
