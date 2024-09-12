import {SafeAreaView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import General from "../../utility/General";
import {Concept, CustomFilter, DashboardFilterConfig, Range} from 'openchs-models';
import AvniIcon from '../common/AvniIcon';
import {FilterActionNames} from '../../action/mydashboard/FiltersActionsV2';
import _ from 'lodash';
import Styles from "../primitives/Styles";
import Colors from '../primitives/Colors';

function MultiValueFilterDisplay({labelTexts, filter}) {
    return <View key={filter.name} style={{display: "flex", flexDirection: "row", flexWrap: "wrap"}}>
        {labelTexts.map((labelText, index) => {
            return <View style={{display: "flex", flexDirection: "row", flexWrap: "wrap"}}>
                <Text style={{
                    fontSize: 14,
                    color: Styles.greyText,
                    fontWeight: 'bold',
                }}>{labelText.label} - </Text>
                <Text style={{
                    fontSize: 14,
                    color: Styles.greyText
                }}>{labelText.text}</Text>
            </View>;
        })}
    </View>;
}

function FilterDisplay({filter, content}) {
    return <View key={filter.name} style={{display: "flex", flexDirection: "row", flexWrap: "wrap"}}>
        <Text style={{
            fontSize: 14,
            color: Styles.greyText,
            fontWeight: 'bold',
        }}>{filter.name} - </Text>
        <Text style={{
            fontSize: 14,
            color: Styles.greyText
        }}>{content}</Text>
    </View>;
}

function getFiltersToDisplay(selectedFilterValues, filterUUIDsToIgnore, dashboard, filterConfigs) {
    return Object.keys(selectedFilterValues).filter(filterUUID => !filterUUIDsToIgnore.includes(filterUUID))
        .map((filterUUID) => {
            const filter = dashboard.getFilter(filterUUID);
            const inputDataType = filterConfigs[filterUUID].getInputDataType();
            const filterType = filterConfigs[filterUUID].type;
            const selectedFilterValue = selectedFilterValues[filterUUID];

            General.logDebug("AppliedFiltersV2", "getFiltersToDisplay", inputDataType, filter.name, filterType);

            if (filterType === CustomFilter.type.Address) {
                const labelTexts = selectedFilterValue.map((x) => {return {label: x.type, text: x.name}});
                return <MultiValueFilterDisplay filter={filter} labelTexts={labelTexts}/>;
            }

            switch (inputDataType) {
                case Concept.dataType.Coded:
                case DashboardFilterConfig.dataTypes.array:
                    return !_.isEmpty(selectedFilterValue) &&
                        <FilterDisplay filter={filter}
                                       content={selectedFilterValue.map((x) => x.name).join(", ")}/>;
                case Concept.dataType.Date:
                    return !_.isNil(selectedFilterValue) && <FilterDisplay filter={filter}
                                                                           content={General.toDisplayDate(selectedFilterValue)}/>
                case Concept.dataType.DateTime:
                    return !_.isNil(selectedFilterValue) && <FilterDisplay filter={filter}
                                                                           content={General.formatDateTime(selectedFilterValue)}/>
                case Concept.dataType.Time:
                    return !_.isNil(selectedFilterValue) && <FilterDisplay filter={filter}
                                                                           content={General.toDisplayTime(selectedFilterValue)}/>
                case Range.DateRange:
                    return !_.isNil(selectedFilterValue) && !selectedFilterValue.isEmpty() &&
                        <FilterDisplay filter={filter}
                                       content={`${General.toDisplayDate(selectedFilterValue.minValue)} - ${General.toDisplayDate(selectedFilterValue.maxValue)}`}/>
                case DashboardFilterConfig.dataTypes.formMetaData:
                    let labelTexts = [];
                    if (selectedFilterValue.subjectTypes.length > 0) {
                        const label = selectedFilterValue.subjectTypes.length > 1 ? "Subject Types" : "Subject Type";
                        labelTexts.push({label: label, text: selectedFilterValue.subjectTypes.map(x => x.name).join(", ")});
                    }
                    if (selectedFilterValue.programs.length > 0) {
                        const label = selectedFilterValue.programs.length > 1 ? "Programs" : "Program";
                        labelTexts.push({label: label, text: selectedFilterValue.programs.map(x => x.name).join(", ")});
                    }
                    if (selectedFilterValue.encounterTypes.length > 0) {
                        const label = selectedFilterValue.encounterTypes.length > 1 ? "Visits" : "Visit";
                        labelTexts.push({label: label, text: selectedFilterValue.encounterTypes.map(x => x.name).join(", ")});
                    }

                    return labelTexts.length > 0 &&
                        <MultiValueFilterDisplay filter={filter} labelTexts={labelTexts}/>;
                default:
                    return !_.isNil(selectedFilterValue) &&
                        <FilterDisplay filter={filter} content={selectedFilterValue}/>;
            }
        });
}

export default class AppliedFiltersV2 extends AbstractComponent {
    static styles = StyleSheet.create({
        container: {
            flexDirection: 'column',
            justifyContent: 'flex-start',
        },
        filterIcon: {
            zIndex: 1,
            elevation: 2,
            fontSize: 20,
            color: Styles.accentColor,
            alignSelf: 'flex-end'
        },
    });

    UNSAFE_componentWillMount() {
        this.dispatchAction(FilterActionNames.ON_LOAD, {dashboardUUID: this.props.dashboardUUID});
        super.UNSAFE_componentWillMount();
    }

    onClearFilter(postClearAction) {
        this.dispatchAction(FilterActionNames.CLEAR_FILTER);
        postClearAction();
    }

    render() {
        const {hasFiltersSet, dashboard, selectedFilterValues, filterConfigs, filterUUIDsToIgnore} = this.props;
        const filtersToDisplay = hasFiltersSet && getFiltersToDisplay(selectedFilterValues, filterUUIDsToIgnore, dashboard, filterConfigs);
        const showAppliedFilters = filtersToDisplay && filtersToDisplay.length > 0 && _.some(filtersToDisplay, f => f);
        return showAppliedFilters && (<View style={{
                display: "flex",
                padding: 5,
                backgroundColor: Colors.GreyBackground,
                borderRadius: 5,
                marginHorizontal: 15
            }}>
                <SafeAreaView>
                    <View>
                        <TouchableOpacity style={{flex: 1, alignSelf: 'flex-end'}} onPress={() => this.onClearFilter(this.props.postClearAction)}>
                            <View>
                                <AvniIcon name={'filter-remove-outline'}
                                          style={AppliedFiltersV2.styles.filterIcon}
                                          type='MaterialCommunityIcons'/>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <View style={AppliedFiltersV2.styles.container}>
                        {filtersToDisplay}
                    </View>
                </SafeAreaView>
            </View>
        );
    }
}
