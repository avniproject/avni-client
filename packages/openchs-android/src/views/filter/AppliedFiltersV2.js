import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import React, {Fragment} from 'react';
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";
import General from "../../utility/General";
import {Concept} from 'openchs-models';
import AvniIcon from '../common/AvniIcon';
import {FilterActionNames} from '../../action/mydashboard/FiltersActionsV2';
import _ from 'lodash';

export default class AppliedFiltersV2 extends AbstractComponent {
    static styles = StyleSheet.create({
        container: {
            flexDirection: 'column',
            justifyContent: 'flex-start',
        },
        filterIcon: {
            zIndex: 1,
            paddingTop: 2,
            fontSize: 24,
            color: Colors.FilterClear,
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

    renderContent(label, content, contentSeparator) {
        const separator = _.isNil(contentSeparator) ? '' : contentSeparator;
        return <Text key={label}>
            <Text style={{
                fontSize: 14,
                color: Colors.TextOnPrimaryColor,
                fontWeight: 'bold',
            }}>{label} - </Text>
            <Text style={{
                fontSize: 14,
                color: Colors.TextOnPrimaryColor,
            }}>{content}{separator}</Text>
        </Text>
    }

    renderFilteredLocations() {
        if (this.props.selectedLocations && this.props.selectedLocations.length > 0) {
            let filteredSelectedLocations = this.props.selectedLocations;
            filteredSelectedLocations = _.filter(filteredSelectedLocations, (locationObj =>  locationObj.isSelected));
            const allUniqueTypes = _.uniqBy(_.map(filteredSelectedLocations, ({type}) => ({type})), 'type');
            const content = allUniqueTypes.map((l, index) => this.renderContent(this.I18n.t(l.type),
                _.get(_.groupBy(filteredSelectedLocations, 'type'), l.type, [])
                  .map((locations) => this.I18n.t(locations.name)).join(", "),
                index === filteredSelectedLocations.length - 1 ? ' ' : ' | '));
            return <Text>{content}</Text>
        }
    }

    renderCustomFilters() {
        const readableTime = (dateType, value) => {
            return (dateType && (dateType === Concept.dataType.Time) && General.toDisplayTime(value))
            || (dateType && (dateType === Concept.dataType.DateTime) && General.formatDateTime(value))
            || (dateType && (dateType === Concept.dataType.Date) && General.toDisplayDate(value))
            || value;
        }
        const filterValue = (value) => [
            this.I18n.t(value.name || value.value || readableTime(value.dateType, value.minValue) || ''),
            this.I18n.t(value.maxValue && readableTime(value.dateType, value.maxValue) || '')
        ].filter(Boolean).join(" to ");
        if (!_.isEmpty(this.props.selectedCustomFilters)) {
            const nonEmptyFilters = _.pickBy(this.props.selectedCustomFilters, (v, k) => !_.isEmpty(v));
            const filters = Object.keys(nonEmptyFilters);
            return _.map(filters, filter => {
                const answers = nonEmptyFilters[filter].map(filterValue).join(", ");
                return this.renderContent(this.I18n.t(filter), answers);
            })
        }
    }

    renderGenderFilters() {
        if (!_.isEmpty(this.props.selectedGenders)) {
            const genderNames = _.map(this.props.selectedGenders, gender => this.I18n.t(gender.name)).join(", ");
            return this.renderContent(this.I18n.t('gender'), genderNames);
        }
    }

    render() {
        return (
          <Fragment>
            {this.props.applied && <View>
              <TouchableOpacity onPress={() => this.onClearFilter(this.props.postClearAction)}>
                  <View>
                      <AvniIcon name={'filter-remove-outline'}
                                style={AppliedFiltersV2.styles.filterIcon}
                                type='MaterialCommunityIcons'/>
                  </View>
              </TouchableOpacity>
            </View>}
            <View style={AppliedFiltersV2.styles.container}>
                {this.renderFilteredLocations()}
                {this.renderCustomFilters()}
                {this.renderGenderFilters()}
            </View>
          </Fragment>
        );
    }
}
