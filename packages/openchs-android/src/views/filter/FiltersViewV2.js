import React from "react";
import {Dimensions, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Distances from '../primitives/Distances'
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Path from "../../framework/routing/Path";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import CHSContent from "../common/CHSContent";
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
        selectedGroupSubjectUUIDs: PropTypes.array.isRequired
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
        addressLevelState: PropTypes.object.isRequired
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
        return this.dispatchAction(FilterActionNames.APPLIED_FILTER, {});
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

        const {addressLevelState, loading, filterConfigs, filters, selectedValues, validationResults} = this.state;

        return (
            <CHSContainer style={{backgroundColor: Styles.whiteColor}}>
                <AppHeader title={this.I18n.t('filter')} func={this.props.onBack}/>
                <ScrollView keyboardShouldPersistTaps="handled">
                    <CHSContent>
                        <View style={{backgroundColor: Styles.whiteColor}}>
                            <CustomActivityIndicator loading={loading}/>
                            <View style={[FiltersViewV2.styles.container, {width: width * 0.88, alignSelf: 'center'}]}>
                                {filters.map((filter) => {
                                    const filterConfig = filterConfigs[filter.uuid];
                                    const filterValue = selectedValues[filter.uuid];
                                    const validationResult = validationResults[filter.uuid];
                                    General.logDebugTemp("FiltersViewV2",
                                        `FilterValue: ${filterValue}, TypeOfData: ${typeof filterValue}, FilterConfigType: ${filterConfig.type}`);
                                    switch (filterConfig.type) {
                                        case CustomFilter.type.Gender:
                                            return <GenderFilter selectedGenders={filterValue}
                                                                 invokeCallbacks={false}
                                                                 onSelect={(selectedGenders) => this.dispatchFilterUpdate(filter, selectedGenders)}/>;
                                        case CustomFilter.type.Address:
                                            return <AddressLevels addressLevelState={addressLevelState}
                                                                  onSelect={(updatedAddressLevelState) => this.dispatchFilterUpdate(filter, updatedAddressLevelState)}
                                                                  multiSelect={true}/>;
                                        case CustomFilter.type.RegistrationDate:
                                        case CustomFilter.type.EnrolmentDate:
                                        case CustomFilter.type.ProgramEncounterDate:
                                        case CustomFilter.type.EncounterDate:
                                            return <FilterContainerWithLabel filter={filter}>
                                                <DatePicker pickTime={false} dateValue={filterValue} onChange={(value) => this.dispatchFilterUpdate(filter, value)}/>
                                            </FilterContainerWithLabel>;
                                        case CustomFilter.type.GroupSubject:
                                            return <GroupSubjectFilter filter={filter} filterConfig={filterConfig} selectedGroupSubjectUUIDs={filterValue}/>;
                                        default:
                                            return <ObservationBasedFilterView onChange={(x) => this.dispatchFilterUpdate(filter, x)}
                                                                               filter={filter}
                                                                               observationBasedFilter={filterConfig.observationBasedFilter}
                                                                               validationResult={validationResult} value={filterValue}/>;
                                    }
                                })}
                            </View>
                        </View>
                    </CHSContent>
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
