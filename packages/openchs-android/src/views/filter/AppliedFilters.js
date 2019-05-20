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
            return allUniqueTypes.map((l, index) => this.renderContent(l.type,
                _.get(_.groupBy(this.props.selectedLocations, 'type'), l.type, []).map((locations) => (locations.name)).join(", "),
                index === this.props.selectedLocations.length - 1 ? ' ' : ' | '));
        }
    }

    renderFilteredPrograms() {
        if (this.props.programs.length > 1 && this.props.selectedPrograms.length > 0) {
            const programNames = this.props.selectedPrograms.map((prog) => prog.name);
            return this.renderContent('Program', programNames.join(', '))
        }
    }

    renderFilteredVisits() {
        if (this.props.selectedEncounterTypes.length > 0) {
            const visitNames = this.props.selectedEncounterTypes.map((enc) => enc.name);
            return this.renderContent('Visit', visitNames.join(', '))
        }
    }

    render() {
        const appliedFilters = [...this.props.filters.values()]
            .filter(f => f.isApplied())
            .map((f) => this.renderContent(f.label, f.selectedOptions.join(', ')));

        return (
            <View style={AppliedFilters.styles.container}>
                <Text style={{flex: 1, flexDirection: 'row', flexWrap: 'wrap'}}>
                    {this.renderFilteredLocations()}
                </Text>
                {this.renderFilteredPrograms()}
                {this.renderFilteredVisits()}
                {appliedFilters}
            </View>
        );
    }
}
