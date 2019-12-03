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
import DGS from "../primitives/DynamicGlobalStyles";

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

    onNumericChange(params, filter) {
        this.dispatchAction(CustomFilterNames.ON_NUMERIC_CUSTOM_FILTER_SELECT,
            {
                titleKey: filter.titleKey,
                subjectTypeUUID: filter.subjectTypeUUID,
                ...params
            })
    }

    renderConceptFilters = (filters) => {
        return _.map(filters, (filter, idx) => {
            const concept = this.conceptService.getConceptByUUID(filter.conceptUUID);
            switch (concept.datatype) {
                case (Concept.dataType.Coded) :
                    return this.codedConceptFilter(concept, filter, idx);
                case (Concept.dataType.Text || Concept.dataType.Notes || Concept.dataType.Id) :
                    return this.textConceptFilter(concept, filter, idx);
                case (Concept.dataType.Numeric) :
                    const selectedOne = _.head(this.state.selectedCustomFilters[filter.titleKey]);
                    return filter.widget === 'Range' ?
                        this.numericConceptFilterWithRange(concept, filter, idx, styles.rangeInput, selectedOne) :
                        this.numericConceptFilter(concept, filter, idx, {}, selectedOne);
                case(Concept.dataType.Date):
                    return <View/>;
                case(Concept.dataType.DateTime):
                    return <View/>;
                case(Concept.dataType.Time):
                    return <View/>;
                case(Concept.dataType.Duration):
                    return <View/>;
                default:
                    return <View/>
            }
        })
    };

    textConceptFilter(concept, filter, idx, props) {
        const selectedOne = _.head(this.state.selectedCustomFilters[filter.titleKey]);
        return this.wrap(<View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
            <Text style={Styles.formLabel}>{this.I18n.t(filter.titleKey)}</Text>
            <TextInput {...props} style={[Styles.formBodyText, this.props.style]}
                       underlineColorAndroid={Colors.InputBorderNormal}
                       value={selectedOne && selectedOne.name || ''}
                       onChangeText={(value) => this.dispatchAction(CustomFilterNames.ON_TEXT_CUSTOM_FILTER_SELECT,
                           {
                               titleKey: filter.titleKey,
                               subjectTypeUUID: filter.subjectTypeUUID,
                               name: value
                           })}
                       multiline={false} numberOfLines={1}/>
        </View>, idx)
    }

    numericConceptFilter(concept, filter, idx, props, value) {
        return this.wrap(<View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
            <Text style={Styles.formLabel}>{this.I18n.t(filter.titleKey)}</Text>
            {this.numericInput(props, value && value.upperValue, (value) => this.onNumericChange({upperValue: value.replace(/[^0-9]/g, '')}, filter))}
        </View>, idx)
    }

    numericInput(props, value, onChange) {
        return <TextInput {...props} style={[Styles.formBodyText, this.props.style]}
                          underlineColorAndroid={Colors.InputBorderNormal}
                          value={value}
                          onChangeText={(value) => onChange(value)}
                          multiline={false}/>;
    }

    numericConceptFilterWithRange(concept, filter, idx, props, value) {
        return this.wrap(<View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
            <Text style={Styles.formLabel}>{this.I18n.t(filter.titleKey)}</Text>
            <View key={idx} style={{flexDirection: 'row', marginRight: 10}}>
                {this.numericInput(props, value && value.upperValue, (value) => this.onNumericChange({upperValue: value.replace(/[^0-9]/g, '')}, filter))}
                <Text style={DGS.formRadioText}>{this.I18n.t('- ')}</Text>
                {this.numericInput(props, value && value.lowerValue, (value) => this.onNumericChange({lowerValue: value.replace(/[^0-9]/g, '')}, filter))}
            </View>
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

const styles = {
    rangeInput: {
        paddingBottom: 5,
        paddingTop: 0,
        marginBottom: 5,
        width: 50,
        color: Colors.InputNormal
    }
};

export default CustomFilters;