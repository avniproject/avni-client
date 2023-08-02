import React from "react";
import {Dimensions, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Distances from '../primitives/Distances'
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Path from "../../framework/routing/Path";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import {FilterActionNames} from "../../action/mydashboard/FiltersActionsV2";
import AddressLevels from "../common/AddressLevels";
import General from "../../utility/General";
import GenderFilter from "./GenderFilter";
import CustomActivityIndicator from "../CustomActivityIndicator";
import {ScrollView} from "native-base";
import PropTypes from "prop-types";
import ObservationBasedFilterView, {FilterContainer, FilterContainerWithLabel} from "./ObservationBasedFilterView";
import {CustomFilter} from 'openchs-models';
import DatePicker from "../primitives/DatePicker";
import _ from "lodash";
import SelectableItemGroup from "../primitives/SelectableItemGroup";
import UserInfoService from "../../service/UserInfoService";
import RadioLabelValue from "../primitives/RadioLabelValue";
import IndividualService from "../../service/IndividualService";
import DateRangeFilter from "./DateRangeFilter";
import TypedTransition from "../../framework/routing/TypedTransition";
import AddressLevelState from '../../action/common/AddressLevelsState';

class GroupSubjectFilter extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            groupSubjects: []
        }
    }

    static propTypes = {
        filter: PropTypes.object.isRequired,
        filterConfig: PropTypes.object.isRequired,
        selectedGroupSubjectUUIDs: PropTypes.array,
        onChange: PropTypes.func
    }

    UNSAFE_componentWillMount() {
        const groupSubjects = this.getService(IndividualService).getAllBySubjectTypeUUID(this.props.filterConfig.groupSubjectTypeFilter.subjectType.uuid);
        this.setState({groupSubjects: groupSubjects});
    }

    render() {
        const {filter, selectedGroupSubjectUUIDs} = this.props;
        const {groupSubjects} = this.state;

        if (groupSubjects.length === 0) return null;

        const labelValuePairs = groupSubjects.map((x) => new RadioLabelValue(`${x.nameString} (${x.lowestAddressLevel.translatedFieldValue})`, x.uuid));

        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        return <FilterContainer>
            <SelectableItemGroup
                locale={currentLocale}
                I18n={this.I18n}
                multiSelect={true}
                inPairs={true}
                onPress={(value) => this.props.onChange(value)}
                selectionFn={(groupSubjectUUID) => _.includes(selectedGroupSubjectUUIDs, groupSubjectUUID)}
                labelKey={filter.name}
                labelValuePairs={labelValuePairs}/>
        </FilterContainer>;
    }
}

@Path('/FilterViewV2')
class FiltersViewV2 extends AbstractComponent {
    static propTypes = {
        dashboardUUID: PropTypes.string.isRequired,
        onFilterChosen: PropTypes.func.isRequired,
        loadFiltersData: PropTypes.func.isRequired,
    };

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
        super(props, context, Reducers.reducerKeys.filterActionV2);
    }

    viewName() {
        return "FilterViewV2";
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(FilterActionNames.ON_LOAD, {dashboardUUID: this.props.dashboardUUID});
        super.UNSAFE_componentWillMount();
    }

    onApply() {
        this.dispatchAction(FilterActionNames.BEFORE_APPLY_FILTER, {status: true});
        setTimeout(() => this.applyFilters(), 0);
        // this.goBack();
    }

    applyFilters() {
        this.dispatchAction(FilterActionNames.APPLIED_FILTER, {
            navigateToDashboardView: (ruleInput) => {
                TypedTransition.from(this).goBack();
                setTimeout(() => {
                    this.props.onFilterChosen(ruleInput);
                }, 100);
            },
            setFiltersDataOnDashboardView: (customDashboardFilters) => {
                setTimeout(() => {
                    this.props.loadFiltersData(customDashboardFilters);
                }, 100);
            },
        });
    }

    onHardwareBackPress() {
        this.props.onBack();
        return true;
    }

    dispatchFilterUpdate(filter, value) {
        this.dispatchAction(FilterActionNames.ON_FILTER_UPDATE, {filter: filter, value: value});
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const {width} = Dimensions.get('window');

        const {loading, filterConfigs, filters, selectedValues, filterErrors} = this.state;

        return (
            <CHSContainer style={{backgroundColor: Styles.whiteColor, display: "flex", flexDirection: "column", paddingBottom: 50}}>
                <AppHeader title={this.I18n.t('filter')} func={this.props.onBack}/>
                <ScrollView keyboardShouldPersistTaps="handled">
                    <View style={{backgroundColor: Styles.whiteColor}}>
                        <CustomActivityIndicator loading={loading}/>
                        <View style={[FiltersViewV2.styles.container, {width: width * 0.88, alignSelf: 'center'}]}>
                            {filters.map((filter, index) => {
                                const filterConfig = filterConfigs[filter.uuid];
                                const filterValue = selectedValues[filter.uuid];
                                const filterError = filterErrors[filter.uuid];

                                switch (filterConfig.type) {
                                    case CustomFilter.type.Gender:
                                        return <GenderFilter selectedGenders={filterValue || []}
                                                             filterLabel={this.I18n.t(filter.name)}
                                                             key={index}
                                                             deprecatedUsage={false}
                                                             onSelect={(gender) => this.dispatchFilterUpdate(filter, gender)}/>;
                                    case CustomFilter.type.Address:
                                        const selectedAddressesInfo = _.flatten([...new Map(filterValue?.levels).values()])
                                          .map(({uuid, name, level, type, isSelected, parentUuid}) => ({
                                              uuid,
                                              name,
                                              level,
                                              type,
                                              parentUuid,
                                              isSelected
                                          }));
                                        return <AddressLevels addressLevelState={new AddressLevelState(selectedAddressesInfo)}
                                                              fieldLabel={this.I18n.t(filter.name)}
                                                              key={index}
                                                              onSelect={(updatedAddressLevelState) => this.dispatchFilterUpdate(filter, updatedAddressLevelState)}
                                                              multiSelect={true}/>;
                                    case CustomFilter.type.RegistrationDate:
                                    case CustomFilter.type.EnrolmentDate:
                                    case CustomFilter.type.ProgramEncounterDate:
                                    case CustomFilter.type.EncounterDate:
                                        return <FilterContainerWithLabel filter={filter} key={index}>
                                            {filterConfig.widget === CustomFilter.widget.Range ?
                                                <DateRangeFilter pickTime={false} maxValue={_.get(filterValue, "maxValue")} minValue={_.get(filterValue, "minValue")}
                                                                 onChange={(x) => this.dispatchFilterUpdate(filter, x)} errorMessage={filterError}/>
                                                :
                                                <DatePicker pickTime={false} dateValue={filterValue} onChange={(value) => this.dispatchFilterUpdate(filter, value)}/>}
                                        </FilterContainerWithLabel>;
                                    case CustomFilter.type.GroupSubject:
                                        return <GroupSubjectFilter filter={filter} filterConfig={filterConfig} selectedGroupSubjectUUIDs={filterValue} key={index}
                                                                   onChange={(x) => this.dispatchFilterUpdate(filter, x)}/>;
                                    default:
                                        return <ObservationBasedFilterView onChange={(x) => this.dispatchFilterUpdate(filter, x)} key={index}
                                                                           errorMessage={filterError}
                                                                           filter={filter}
                                                                           filterConfig={filterConfig}
                                                                           observationBasedFilter={filterConfig.observationBasedFilter}
                                                                           value={filterValue}/>;
                                }
                            })}
                        </View>
                    </View>
                </ScrollView>
                <TouchableOpacity activeOpacity={0.5}
                                  onPress={() => this.onApply()}
                                  style={FiltersViewV2.styles.floatingButton}>
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

export default FiltersViewV2;
