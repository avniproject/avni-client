import AbstractComponent from "../../framework/view/AbstractComponent";
import MultiSelectFilter from "./MultiSelectFilter";
import {Concept, CustomFilter} from "avni-models";
import React from "react";
import Styles from "../primitives/Styles";
import {TextInput, View} from 'react-native';
import Distances from "../primitives/Distances";
import Colors from '../primitives/Colors';
import {Text} from "native-base";
import DatePicker from "../primitives/DatePicker";
import TimePicker from "../primitives/TimePicker";
import MultiSelectFilterModel from "../../model/MultiSelectFilterModel";
import UserInfoService from "../../service/UserInfoService";
import PropTypes from "prop-types";
import _ from 'lodash';
import DateRangeFilter from "./DateRangeFilter";

export function FilterContainer({children}) {
    return <View style={{marginTop: Distances.ScaledVerticalSpacingBetweenFormElements, marginBottom: Distances.ScaledVerticalSpacingBetweenFormElements}}>
        {children}
    </View>;
}

export class FilterContainerWithLabel extends AbstractComponent {
    constructor(props, context, topLevelStateVariable) {
        super(props, context, topLevelStateVariable);
    }

    static propTypes = {
        filter: PropTypes.object.isRequired
    }

    render() {
        return <FilterContainer>
            <View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
                <Text style={Styles.formLabel}>{this.I18n.t(this.props.filter.name)}</Text>
                {this.props.children}
            </View>
        </FilterContainer>;
    }
}

//map concept answers and display them
class ObservationBasedFilterView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        filter: PropTypes.object.isRequired,
        observationBasedFilter: PropTypes.object.isRequired,
        value: PropTypes.any,
        onChange: PropTypes.func.isRequired
    };

    timeConceptFilter() {
        return <TimePicker timeValue={this.props.value} onChange={(value) => this.props.onChange(value)}/>;
    }

    timeRangeFilter() {
        const {minValue, maxValue} = this.props.value;
        return <View style={{flexDirection: 'row', marginRight: 10, alignItems: 'center', flexWrap: 'wrap'}}>
            <Text style={Styles.formLabel}>{this.I18n.t('between')}</Text>
            <TimePicker timeValue={minValue} onChange={(value) => this.props.onChange({minValue: value})}/>
            <Text style={Styles.formLabel}>{this.I18n.t('and')}</Text>
            <TimePicker timeValue={maxValue} onChange={(value) => this.props.onChange({maxValue: value})}/>
        </View>;
    }

    // typeof dateObject.value === 'string' ? new Date(dateObject.value) : dateObject.value
    dateConceptFilter(pickTime) {
        return <DatePicker pickTime={pickTime} dateValue={this.props.value} onChange={(value) => this.props.onChange(value)}/>;
    }

    dateFilterWithRange(pickTime) {
        const {minValue, maxValue} = this.props.value;
        return <DateRangeFilter pickTime={pickTime} onChange={(value) => this.props.onChange(value)} minValue={minValue} maxValue={maxValue}/>;
    }

    textConceptFilter() {
        return <TextInput style={[Styles.formBodyText]}
                          underlineColorAndroid={Colors.InputBorderNormal}
                          value={this.props.value}
                          onChangeText={(value) => this.props.onChange(value)}
                          multiline={false} numberOfLines={1}/>;
    }

    numericConceptFilter() {
        return <TextInput style={[Styles.formBodyText]}
                          underlineColorAndroid={Colors.InputBorderNormal}
                          value={value}
                          onChangeText={(value) => this.props.onChange(value)}
                          multiline={false}/>;
    }

    numericConceptFilterWithRange(concept, filter, idx, props, value) {
        return <View key={idx} style={{flexDirection: 'row', marginRight: 10, alignItems: 'center', flexWrap: 'wrap'}}>
            <Text style={[Styles.formLabel, {paddingBottom: 10}]}>{this.I18n.t('between')}</Text>
            <TextInput style={[Styles.formBodyText]}
                       underlineColorAndroid={Colors.InputBorderNormal}
                       value={value}
                       onChangeText={(value) => this.props.onChange({minValue: value})}
                       multiline={false}/>
            <Text style={[Styles.formLabel, {paddingBottom: 10}]}>{this.I18n.t('and')}</Text>
            <TextInput style={[Styles.formBodyText]}
                       underlineColorAndroid={Colors.InputBorderNormal}
                       value={value}
                       onChangeText={(value) => this.props.onChange({maxValue: value})}
                       multiline={false}/>
        </View>;
    }

    renderCodedConceptFilter() {
        const {filter, observationBasedFilter, value} = this.props;
        const locale = this.getService(UserInfoService).getUserSettings().locale;
        const conceptAnswers = observationBasedFilter.concept.getAnswers();
        const selectedConcepts = _.isNil(value) ? [] : value.map(c => c.name);
        const optsFnMap = conceptAnswers.reduce((conceptMap, conceptAnswers) => conceptMap.set(conceptAnswers.concept.name, conceptAnswers), new Map());
        const filterModel = new MultiSelectFilterModel(filter.name, optsFnMap, new Map(), selectedConcepts).selectOption(selectedConcepts);
        return <MultiSelectFilter filter={filterModel}
                                  locale={locale}
                                  I18n={this.I18n}
                                  onSelect={(conceptAnswerName) => this.props.onChange(_.find(conceptAnswers, (x) => conceptAnswerName === x.concept.name).concept)}/>;
    }

    renderNonCodedFilter() {
        const {observationBasedFilter, filter, value} = this.props;
        const concept = observationBasedFilter.concept;

        switch (concept.datatype) {
            case (Concept.dataType.Text) :
            case (Concept.dataType.Notes) :
            case (Concept.dataType.Id) :
                return this.textConceptFilter(concept, filter);
            case (Concept.dataType.Numeric) :
                return filter.widget === CustomFilter.widget.Range ?
                    this.numericConceptFilterWithRange(concept, filter, styles.rangeInput, value) :
                    this.numericConceptFilter(concept, filter, {}, value);
            case(Concept.dataType.Date):
                return filter.widget === CustomFilter.widget.Range ?
                    this.dateFilterWithRange(filter, value, false)
                    : this.dateConceptFilter(filter, value, false);
            case(Concept.dataType.DateTime):
                return filter.widget === CustomFilter.widget.Range ?
                    this.dateFilterWithRange(filter, value, true)
                    : this.dateConceptFilter(filter, value, true);
            case(Concept.dataType.Time):
                return filter.widget === CustomFilter.widget.Range ?
                    this.timeRangeFilter(filter, value) :
                    this.timeConceptFilter(filter, value);
            default:
                return <View/>;
        }
    }

    render() {
        const {observationBasedFilter, filter} = this.props;
        const concept = observationBasedFilter.concept;

        if (concept.datatype === Concept.dataType.Coded) {
            return <FilterContainer>
                {this.renderCodedConceptFilter()}
            </FilterContainer>;
        }

        return <FilterContainerWithLabel filter={filter}>
            {this.renderNonCodedFilter()}
        </FilterContainerWithLabel>;
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

export default ObservationBasedFilterView;
