import React from "react";
import {Dimensions, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Distances from '../primitives/Distances'
import SingleSelectFilter from './SingleSelectFilter';
import MultiSelectFilter from './MultiSelectFilter';
import {Filter, SingleSelectFilter as SingleSelectFilterModel, SubjectType, CustomFilter} from 'avni-models';
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Path from "../../framework/routing/Path";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import CHSContent from "../common/CHSContent";
import Reducers from "../../reducer";
import {FilterActionNames} from "../../action/mydashboard/FiltersActions";
import AddressLevels from "../common/AddressLevels";
import _ from "lodash";
import DatePicker from "../primitives/DatePicker";
import Separator from "../primitives/Separator";
import ProgramFilter from "../common/ProgramFilter";
import FormMappingService from "../../service/FormMappingService";
import EntityService from "../../service/EntityService";
import General from "../../utility/General";
import CustomFilters from "./CustomFilters";
import CustomFilterService from "../../service/CustomFilterService";
import GenderFilter from "./GenderFilter";


@Path('/FilterView')
class FilterView extends AbstractComponent {
    static propTypes = {};

    static styles = StyleSheet.create({
        container: {
            marginRight: Distances.ScaledContentDistanceFromEdge,
            marginLeft: Distances.ScaledContentDistanceFromEdge,
            padding: 10,
            backgroundColor: Styles.whiteColor
        },
        floatingButton: {
            position: 'absolute',
            width: '100%',
            height: 50,
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center',
            bottom: 0,
            backgroundColor: Colors.AccentColor
        },

        floatingButtonIcon: {
            color: Colors.TextOnPrimaryColor
        }
    });

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.filterAction);
        this.filterMap = new Map([[Filter.types.SingleSelect, SingleSelectFilter],
            [Filter.types.MultiSelect, MultiSelectFilter]]);
        this.formMappingService = context.getService(FormMappingService);
        this.entityService = context.getService(EntityService);
        this.customFilterService = context.getService(CustomFilterService)
    }

    viewName() {
        return "FilterView";
    }

    componentWillMount() {
        const subjectTypes = this.entityService.findAll(SubjectType.schema.name);
        const selectedSubjectType = this.props.selectedSubjectType || subjectTypes[0];
        const programs = this.formMappingService.findProgramsForSubjectType(selectedSubjectType);
        const selectedPrograms = programs.length === 1 ? programs : this.props.selectedPrograms;
        const encounterTypes = programs.length === 1
            ? this.formMappingService.findEncounterTypesForProgram(_.first(programs), selectedSubjectType)
            : this.props.encounterTypes;

        this.dispatchAction(FilterActionNames.ON_LOAD, {
            filters: this.props.filters,
            locationSearchCriteria: this.props.locationSearchCriteria,
            addressLevelState: this.props.addressLevelState,
            filterDate: this.props.filterDate,
            programs: programs,
            selectedPrograms: selectedPrograms,
            encounterTypes,
            selectedEncounterTypes: this.props.selectedEncounterTypes,
            generalEncounterTypes: this.props.generalEncounterTypes,
            selectedGeneralEncounterTypes: this.props.selectedGeneralEncounterTypes,
            selectedCustomFilters: this.props.selectedCustomFilters,
            subjectTypes,
            selectedSubjectType
        });
        super.componentWillMount();
    }

    onSelect(filter, idx) {
        return (val) => {
            const newFilter = filter.selectOption(val);
            if (!_.isNil(newFilter)) {
                this.dispatchAction(FilterActionNames.ADD_FILTER, {filter: newFilter});
            }
        }
    }

    onApply() {
        this.dispatchAction(this.props.actionName, {
            filters: this.state.filters,
            locationSearchCriteria: this.state.locationSearchCriteria,
            addressLevelState: this.state.addressLevelState,
            selectedLocations: this.state.addressLevelState.selectedAddresses,
            filterDate: this.state.filterDate.value,
            programs: this.state.programs,
            selectedPrograms: this.state.selectedPrograms,
            encounterTypes: this.state.encounterTypes,
            selectedEncounterTypes: this.state.selectedEncounterTypes,
            generalEncounterTypes: this.state.generalEncounterTypes,
            selectedGeneralEncounterTypes: this.state.selectedGeneralEncounterTypes,
            listType: this.props.listType,
            selectedSubjectType: this.state.selectedSubjectType,
            selectedCustomFilters: this.state.selectedCustomFilters,
            selectedGenders: this.state.selectedGenders,
        });
        this.goBack();
    }

    onHardwareBackPress() {
        this.props.onBack();
        return true;
    }

    onVisitSelect(name, uuid) {
        this.dispatchAction(FilterActionNames.ADD_VISITS, {encounterUUID: uuid})
    }

    onGeneralVisitSelect(name, uuid) {
        this.dispatchAction(FilterActionNames.ADD_GENERAL_VISITS, {encounterUUID: uuid})
    }

    onProgramSelect(name, uuid) {
        const encounters = this.formMappingService.findEncounterTypesForProgram({uuid});
        this.dispatchAction(FilterActionNames.LOAD_ENCOUNTERS, {encounters: encounters});
        this.dispatchAction(FilterActionNames.ADD_PROGRAM, {programUUID: uuid});
    }

    renderProgramEncounterGroup() {
        const programFilter = <ProgramFilter
            onToggle={(name, uuid) => this.onProgramSelect(name, uuid)}
            visits={this.state.programs}
            multiSelect={true}
            selectionFn={(uuid) => this.state.selectedPrograms.filter((prog) => prog.uuid === uuid).length > 0}
            name={'Program'}/>;
        const programEncounterFilter = <ProgramFilter
            onToggle={(name, uuid) => this.onVisitSelect(name, uuid)}
            visits={this.state.encounterTypes}
            multiSelect={true}
            selectionFn={(uuid) => this.state.selectedEncounterTypes.filter((prog) => prog.uuid === uuid).length > 0}
            name={'Visits'}/>;
        return <View style={{
            marginTop: Styles.VerticalSpacingBetweenFormElements,
            marginBottom: Styles.VerticalSpacingBetweenFormElements,
        }}>
            <View style={{
                borderWidth: 1,
                borderStyle: 'dashed',
                borderRadius: 1,
                borderColor: Colors.InputBorderNormal,
                paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
            }}>
                {this.state.programs.length === 1 ?
                    programEncounterFilter
                    :
                    <View>
                        {this.state.programs.length > 0 ? programFilter : <View/>}
                        {this.state.encounterTypes.length > 0 ? programEncounterFilter : <View/>}
                    </View>
                }
            </View>
        </View>
    }

    renderEncounterGroup() {
        return this.state.generalEncounterTypes.length === 0 ? <View/> :
            <View style={{
                marginTop: Styles.VerticalSpacingBetweenFormElements,
                marginBottom: Styles.VerticalSpacingBetweenFormElements,
            }}>
                <View style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderRadius: 1,
                    borderColor: Colors.InputBorderNormal,
                    paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
                }}>
                    <ProgramFilter
                        onToggle={(name, uuid) => this.onGeneralVisitSelect(name, uuid)}
                        visits={this.state.generalEncounterTypes}
                        multiSelect={true}
                        selectionFn={uuid => _.some(this.state.selectedGeneralEncounterTypes, e => e.uuid === uuid)}
                        name={'GeneralVisits'}/>
                </View>
            </View>
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const {width} = Dimensions.get('window');
        const filterScreenName = 'myDashboardFilters';
        let subjectTypeSelectFilter = SingleSelectFilterModel.forSubjectTypes(this.state.subjectTypes, this.state.selectedSubjectType);
        const nonCodedCustomFilters = this.customFilterService.getAllExceptCodedConceptFilters(filterScreenName, this.state.selectedSubjectType.uuid);
        const codedCustomFilters = this.customFilterService.getCodedConceptFilters(filterScreenName, this.state.selectedSubjectType.uuid);
        return (
            <CHSContainer style={{backgroundColor: Styles.whiteColor}}>
                <AppHeader title={this.I18n.t('filter')} func={this.props.onBack}/>
                <CHSContent>
                    <View style={{backgroundColor: Styles.whiteColor}}>
                        <View style={[FilterView.styles.container, {width: width * 0.88, alignSelf: 'center'}]}>
                            <View style={{flexDirection: "column", justifyContent: "flex-start"}}>
                                <Text style={{fontSize: 15, color: Styles.greyText}}>{this.I18n.t("date")}</Text>
                                <DatePicker
                                    nonRemovable={true}
                                    actionName={FilterActionNames.ON_DATE}
                                    actionObject={this.state.filterDate}
                                    pickTime={false}
                                    dateValue={this.state.filterDate.value}/>
                            </View>
                            {this.state.subjectTypes.length > 1 &&
                            (<SingleSelectFilter filter={subjectTypeSelectFilter} onSelect={(subjectTypeName) => {
                                this.dispatchAction(FilterActionNames.ADD_SUBJECT_TYPE, {subjectTypeName})
                            }}/>)
                            }
                            {!_.isEmpty(nonCodedCustomFilters) ?
                                <CustomFilters filters={nonCodedCustomFilters}
                                               selectedCustomFilters={this.props.selectedCustomFilters}
                                               onSelect={(selectedCustomFilters) => this.dispatchAction(FilterActionNames.CUSTOM_FILTER_CHANGE, {selectedCustomFilters})}
                                /> : null}
                            {this.customFilterService.filterTypePresent(filterScreenName, CustomFilter.type.Gender, this.state.selectedSubjectType.uuid) ?
                                <GenderFilter selectedGenders={this.props.selectedGenders}
                                              onSelect={(selectedGenders) => this.dispatchAction(FilterActionNames.GENDER_FILTER_CHANGE, {selectedGenders})}
                                /> : null}
                            {this.renderProgramEncounterGroup()}
                            {this.renderEncounterGroup()}
                            {this.customFilterService.filterTypePresent(filterScreenName, CustomFilter.type.Address, this.state.selectedSubjectType.uuid) ?
                                <AddressLevels
                                addressLevelState={this.state.addressLevelState}
                                onSelect={(addressLevelState) => {
                                    this.dispatchAction(FilterActionNames.INDIVIDUAL_SEARCH_ADDRESS_LEVEL, {
                                        addressLevelState: addressLevelState
                                    })
                                }}
                                multiSelect={true}/> : null}
                            {!_.isEmpty(codedCustomFilters) ?
                                <CustomFilters filters={codedCustomFilters}
                                               selectedCustomFilters={this.props.selectedCustomFilters}
                                               onSelect={(selectedCustomFilters) => this.dispatchAction(FilterActionNames.CUSTOM_FILTER_CHANGE, {selectedCustomFilters})}
                                /> : null}
                            <Separator height={50} backgroundColor={Styles.whiteColor}/>
                        </View>
                    </View>
                </CHSContent>
                <TouchableOpacity activeOpacity={0.5}
                                  onPress={() => this.onApply()}
                                  style={FilterView.styles.floatingButton}>
                    <Text style={{
                        fontSize: Styles.normalTextSize,
                        color: Colors.TextOnPrimaryColor,
                        alignSelf: "center"
                    }}>Apply</Text>
                </TouchableOpacity>
            </CHSContainer>
        );
    }
}

export default FilterView;
