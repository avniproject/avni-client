import AbstractComponent from "../../framework/view/AbstractComponent";
import {View} from 'react-native';
import ConceptService from "../../service/ConceptService";
import MultiSelectFilter from "./MultiSelectFilter";
import {MultiSelectFilter as MultiSelectFilterModel} from "openchs-models";
import React from "react";
import Reducers from "../../reducer";
import {FilterActionNames} from "../../action/mydashboard/FiltersActions";

class CustomFilters extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.filterAction);
        this.conceptService = context.getService(ConceptService);
    }

    render() {
        const conceptAnswers = this.conceptService.findConcept("Standard").getAnswers();
        const selectedOne = this.state.selectedCustomFilters.map(c => c.name);
        const optsFnMap = conceptAnswers.reduce((conceptMap, conceptAnswers) => conceptMap.set(conceptAnswers.concept.name, conceptAnswers), new Map());
        const filterModel = new MultiSelectFilterModel("Standard", optsFnMap, new Map(), selectedOne).selectOption(selectedOne);
        return (
            <MultiSelectFilter filter={filterModel}
                               onSelect={(conceptAnswerName) => this.dispatchAction(FilterActionNames.ON_CUSTOM_FILTER_SELECT, {name: conceptAnswerName})}/>
        );
    }

}

export default CustomFilters;
