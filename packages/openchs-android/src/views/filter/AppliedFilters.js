import {StyleSheet, Text, View} from "react-native";
import React from 'react';
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";

export default class AppliedFilters extends AbstractComponent {
    static styles = StyleSheet.create({
        container: {
            flexDirection: 'column',
            justifyContent: 'flex-start',
        },
    });

    renderContent(label, content, contentSeparator) {
        const separator = _.isNil(contentSeparator) ? '' : contentSeparator;
        return <Text>
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
                _.get(_.groupBy(this.props.selectedLocations, 'type'), l.type, []).map((locations) => this.I18n.t(locations.name.replace(/\./g, ""))).join(", "),
                index === this.props.selectedLocations.length - 1 ? ' ' : ' | '));
        }
    }

    renderFilteredPrograms() {
        if (this.props.programs.length > 1 && this.props.selectedPrograms.length > 0) {
            const programNames = this.props.selectedPrograms.map((prog) => this.I18n.t(prog.operationalProgramName || prog.name));
            return this.renderContent(this.I18n.t('Program'), programNames.join(', '))
        }
    }

    renderFilteredVisits() {
        if (this.props.selectedEncounterTypes.length > 0) {
            const visitNames = this.props.selectedEncounterTypes.map((encType) => this.I18n.t(encType.operationalEncounterTypeName));
            return this.renderContent(this.I18n.t('Visit'), visitNames.join(', '))
        }
    }

    renderFilteredGeneralVisits() {
        if (!_.isEmpty(this.props.selectedGeneralEncounterTypes)) {
            const visitNames = _.map(this.props.selectedGeneralEncounterTypes, 'operationalEncounterTypeName')
                .map(x => this.I18n.t(x))
                .join(', ');
            return this.renderContent(this.I18n.t('General Visit'), visitNames);
        }
    }

    renderCustomFilters() {
        if (!_.isEmpty(this.props.selectedCustomFilters)) {
            const nonEmptyFilters = _.pickBy(this.props.selectedCustomFilters, (v, k) => !_.isEmpty(v));
            const filters = Object.keys(nonEmptyFilters);
            return _.map(filters, filter => {
                const answers = nonEmptyFilters[filter].map(value => this.I18n.t(value.name || value.upperValue)).join(", ");
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
        const appliedFilters = [...this.props.filters.values()]
            .filter(f => f.isApplied())
            .map((f) => this.renderContent(f.label, f.selectedOptions.join(', ')));

        return (
            <View style={AppliedFilters.styles.container}>
                <Text>
                    {this.renderFilteredLocations()}
                </Text>
                {this.renderFilteredPrograms()}
                {this.renderFilteredVisits()}
                {this.renderFilteredGeneralVisits()}
                {this.renderCustomFilters()}
                {this.renderGenderFilters()}
                {appliedFilters}
            </View>
        );
    }
}
