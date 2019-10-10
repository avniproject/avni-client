import AbstractComponent from "../../framework/view/AbstractComponent";
import ConceptService from "../../service/ConceptService";
import MultiSelectFilter from "./MultiSelectFilter";
import {MultiSelectFilter as MultiSelectFilterModel} from "openchs-models";
import React from "react";
import Reducers from "../../reducer";
import {CustomFilterNames} from "../../action/mydashboard/CustomFilterActions";
import _ from 'lodash';
import CustomFilterService from "../../service/CustomFilterService";

class CustomFilters extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.customFilterActions);
        this.conceptService = context.getService(ConceptService);
        this.customFilterService = context.getService(CustomFilterService)
    }

    componentWillMount() {
        this.dispatchAction(CustomFilterNames.ON_LOAD, {props : this.props});
        super.componentWillMount();
    }

    renderFilters = (filters) => {
        return _.map(filters, filter => {
            const conceptAnswers = this.conceptService.getConceptByUUID(filter.conceptUUID).getAnswers();
            const selectedOne = this.state.selectedCustomFilters[filter.titleKey].map(c => c.name);
            const optsFnMap = conceptAnswers.reduce((conceptMap, conceptAnswers) => conceptMap.set(conceptAnswers.concept.name, conceptAnswers), new Map());
            const filterModel = new MultiSelectFilterModel(filter.titleKey, optsFnMap, new Map(), selectedOne).selectOption(selectedOne);
            return <MultiSelectFilter filter={filterModel}
                                      onSelect={(conceptAnswerName) => this.dispatchAction(CustomFilterNames.ON_CUSTOM_FILTER_SELECT,
                                          {
                                              titleKey: filter.titleKey,
                                              conceptAnswerName,
                                              conceptAnswers
                                          })}/>
        })
    };

    _invokeCallbacks() {
        if (_.isFunction(this.props.onSelect)) {
            this.props.onSelect(this.state.selectedCustomFilters);
        }
    }

    render() {
        this._invokeCallbacks();
        return this.renderFilters(this.props.filters)
    }

}

export default CustomFilters;