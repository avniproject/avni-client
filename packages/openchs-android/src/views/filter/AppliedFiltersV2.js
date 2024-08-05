import {SafeAreaView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import React, {Fragment} from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import General from "../../utility/General";
import {Concept, Range, DashboardFilterConfig, CustomFilter} from 'openchs-models';
import AvniIcon from '../common/AvniIcon';
import {FilterActionNames} from '../../action/mydashboard/FiltersActionsV2';
import _ from 'lodash';
import Styles from "../primitives/Styles";
import DashboardFilterService from "../../service/reports/DashboardFilterService";
import Colors from '../primitives/Colors';

function FilterDisplay({filter, content, contentSeparator}) {
    const separator = _.isNil(contentSeparator) ? '' : contentSeparator;
    return <View key={filter.name} style={{display: "flex", flexDirection: "row", flexWrap: "wrap"}}>
        <Text style={{
            fontSize: 14,
            color: Styles.greyText,
            fontWeight: 'bold',
        }}>{filter.name} - </Text>
        <Text style={{
            fontSize: 14,
            color: Styles.greyText
        }}>{content}{separator}</Text>
    </View>;
}

function getFiltersToDisplay(selectedFilterValues, filterUUIDsToIgnore, dashboard, filterConfigs) {
    return Object.keys(selectedFilterValues).filter(filterUUID => !filterUUIDsToIgnore.includes(filterUUID))
      .map((filterUUID) => {
          const filter = dashboard.getFilter(filterUUID);
          const inputDataType = filterConfigs[filterUUID].getInputDataType();
          const selectedFilterValue = selectedFilterValues[filterUUID];

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
                  let displayValue = selectedFilterValue.subjectTypes.map(x => x.name).join(", ");
                  displayValue += selectedFilterValue.programs.length === 0 ? "" : " | ";
                  displayValue += selectedFilterValue.programs.map(x => x.name).join(", ");
                  displayValue += selectedFilterValue.encounterTypes.length === 0 ? "" : " | ";
                  displayValue += selectedFilterValue.encounterTypes.map(x => x.name).join(", ");
                  return !_.isEmpty(displayValue) &&
                    <FilterDisplay filter={filter} content={displayValue}/>;
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
              <SafeAreaView >
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
