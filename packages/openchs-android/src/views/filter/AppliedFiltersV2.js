import {StyleSheet, Text, View} from "react-native";
import React from 'react';
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";
import General from "../../utility/General";
import {Concept} from 'openchs-models';

export default class AppliedFiltersV2 extends AbstractComponent {
    static styles = StyleSheet.create({
        container: {
            flexDirection: 'column',
            justifyContent: 'flex-start',
        },
    });

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
        if (this.props.selectedLocations.length > 0) {
            const allUniqueTypes = _.uniqBy(_.map(this.props.selectedLocations, ({type}) => ({type})), 'type');
            return allUniqueTypes.map((l, index) => this.renderContent(this.I18n.t(l.type),
                _.get(_.groupBy(this.props.selectedLocations, 'type'), l.type, []).map((locations) => this.I18n.t(locations.name)).join(", "),
                index === this.props.selectedLocations.length - 1 ? ' ' : ' | '));
        }
    }

    renderCustomFilters() {
        const readableTime = (dateType, value) =>  (dateType && (dateType === Concept.dataType.Time) && General.toDisplayTime(value))
              || (dateType && (dateType === Concept.dataType.DateTime) && General.formatDateTime(value))
              || (dateType && (dateType === Concept.dataType.Date) && General.toDisplayDate(value))
              || value;
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
            <View style={AppliedFiltersV2.styles.container}>
                <Text>
                    {this.renderFilteredLocations()}
                </Text>
                {this.renderCustomFilters()}
                {this.renderGenderFilters()}
            </View>
        );
    }
}
