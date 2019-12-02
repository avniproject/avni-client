import AbstractComponent from "../../framework/view/AbstractComponent";
import ConceptService from "../../service/ConceptService";
import MultiSelectFilter from "./MultiSelectFilter";
import {MultiSelectFilter as MultiSelectFilterModel, Concept} from "avni-models";
import React from "react";
import Reducers from "../../reducer";
import {CustomFilterNames} from "../../action/mydashboard/CustomFilterActions";
import _ from 'lodash';
import CustomFilterService from "../../service/CustomFilterService";
import Styles from "../primitives/Styles";
import Separator from "../primitives/Separator";
import {View, TextInput} from 'react-native';
import Distances from "../primitives/Distances";
import Colors from '../primitives/Colors';
import {Text} from "native-base";

class CustomFilters extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.customFilterActions);
        this.conceptService = context.getService(ConceptService);
        this.customFilterService = context.getService(CustomFilterService)
    }

    componentWillMount() {
        this.dispatchAction(CustomFilterNames.ON_LOAD, {props: this.props});
        super.componentWillMount();
    }

    wrap(x, idx) {
        return <View style={{marginTop: Distances.ScaledVerticalSpacingBetweenFormElements}} key={idx}>
            {x}
            <Separator height={30} backgroundColor={Styles.whiteColor}/>
        </View>;
    }

    renderConceptFilters = (filters) => {
        return _.map(filters, (filter, idx) => {
            const concept = this.conceptService.getConceptByUUID(filter.conceptUUID);
            switch (concept.datatype) {
                case (Concept.dataType.Coded) :
                    return this.codedConceptFilter(concept, filter, idx);
                case (Concept.dataType.Text) :
                    return this.textConceptFilter(concept, filter, idx);
                default:
                    return <View/>
            }
        })
    };

    textConceptFilter(concept, filter, idx) {
        const selectedOne = _.head(this.state.selectedCustomFilters[filter.titleKey]);
        return this.wrap(<View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
            <Text style={Styles.formLabel}>{this.I18n.t(filter.titleKey)}</Text>
            <TextInput style={[Styles.formBodyText, this.props.style]}
                       underlineColorAndroid={Colors.InputBorderNormal}
                       value={selectedOne && selectedOne.name || ''}
                       onChangeText={(text) => this.dispatchAction(CustomFilterNames.ON_TEXT_CUSTOM_FILTER_SELECT,
                           {
                               titleKey: filter.titleKey,
                               subjectTypeUUID: filter.subjectTypeUUID,
                               name: text
                           })}
                       multiline={false} numberOfLines={1}/>
        </View>, idx)
    }

    codedConceptFilter(concept, filter, idx) {
        const conceptAnswers = concept.getAnswers();
        const selectedOne = this.state.selectedCustomFilters[filter.titleKey].map(c => c.name);
        const optsFnMap = conceptAnswers.reduce((conceptMap, conceptAnswers) => conceptMap.set(conceptAnswers.concept.name, conceptAnswers), new Map());
        const filterModel = new MultiSelectFilterModel(filter.titleKey, optsFnMap, new Map(), selectedOne).selectOption(selectedOne);
        return this.wrap(<MultiSelectFilter filter={filterModel}
                                            onSelect={(conceptAnswerName) => this.dispatchAction(CustomFilterNames.ON_CODED_CUSTOM_FILTER_SELECT,
                                                {
                                                    titleKey: filter.titleKey,
                                                    subjectTypeUUID: filter.subjectTypeUUID,
                                                    conceptAnswerName,
                                                    conceptAnswers
                                                })}/>, idx);
    }

    _invokeCallbacks() {
        if (_.isFunction(this.props.onSelect) && this.state.selectedCustomFilters !== this.props.selectedCustomFilters) {
            this.props.onSelect(this.state.selectedCustomFilters);
        }
    }

    render() {
        this._invokeCallbacks();
        return this.renderConceptFilters(_.filter(this.props.filters, filter => filter.type === 'Concept'))
    }

}

export default CustomFilters;