import AbstractComponent from "../../framework/view/AbstractComponent";
import ConceptService from "../../service/ConceptService";
import MultiSelectFilter from "./MultiSelectFilter";
import {Concept, CustomFilter} from "avni-models";
import React from "react";
import Reducers from "../../reducer";
import {CustomFilterNames} from "../../action/mydashboard/CustomFilterActions";
import _ from 'lodash';
import CustomFilterService from "../../service/CustomFilterService";
import Styles from "../primitives/Styles";
import Separator from "../primitives/Separator";
import {TextInput, View} from 'react-native';
import Distances from "../primitives/Distances";
import Colors from '../primitives/Colors';
import {Text} from "native-base";
import DatePicker from "../primitives/DatePicker";
import TimePicker from "../primitives/TimePicker";
import moment from "moment";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import IndividualService from "../../service/IndividualService";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import AddressLevelsState from "../../action/common/AddressLevelsState";
import MultiSelectFilterModel from "../../model/MultiSelectFilterModel";
import UserInfoService from "../../service/UserInfoService";

class CustomFilters extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.customFilterActions);
        this.conceptService = context.getService(ConceptService);
        this.customFilterService = context.getService(CustomFilterService);
        this.individualService = context.getService(IndividualService);
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(CustomFilterNames.ON_LOAD, {props: this.props});
        super.UNSAFE_componentWillMount();
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

    onGroupSubjectChange(name, groupSubjectUUID, filter) {
        this.dispatchAction(CustomFilterNames.ON_GROUP_SUBJECT_CHANGE,
            {
                titleKey: filter.titleKey,
                subjectTypeUUID: filter.subjectTypeUUID,
                groupSubjectUUID,
                name
            })
    }

    renderConceptFilters = (filters) => {
        return _.map(filters, (filter, idx) => {
            const concept = this.conceptService.getConceptByUUID(filter.conceptUUID);
            const {subjectTypeUUID, titleKey} = filter;
            const selectedValue = _.head(this.state.selectedCustomFilters[titleKey]);
            const requiredDateObject = {...selectedValue, subjectTypeUUID, titleKey};
            switch (concept.datatype) {
                case (Concept.dataType.Coded) :
                    return this.codedConceptFilter(concept, filter, idx);
                case (Concept.dataType.Text) :
                case (Concept.dataType.Notes) :
                case (Concept.dataType.Id) :
                    return this.textConceptFilter(concept, filter, idx);
                case (Concept.dataType.Numeric) :
                    return filter.widget === CustomFilter.widget.Range ?
                        this.numericConceptFilterWithRange(concept, filter, idx, styles.rangeInput, selectedValue) :
                        this.numericConceptFilter(concept, filter, idx, {}, selectedValue);
                case(Concept.dataType.Date):
                    return filter.widget === CustomFilter.widget.Range ?
                        this.dateFilterWithRange(filter, idx, requiredDateObject, false)
                        : this.dateConceptFilter(filter, idx, requiredDateObject, false);
                case(Concept.dataType.DateTime):
                    return filter.widget === CustomFilter.widget.Range ?
                        this.dateFilterWithRange(filter, idx, requiredDateObject, true)
                        : this.dateConceptFilter(filter, idx, requiredDateObject, true);
                case(Concept.dataType.Time):
                    return filter.widget === CustomFilter.widget.Range ?
                        this.timeRangeFilter(filter, idx, requiredDateObject) :
                        this.timeConceptFilter(filter, idx, requiredDateObject);
                default:
                    return <View/>
            }
        })
    };

    renderOtherFilters = (filters) => {
        return _.map(filters, (filter, idx) => {
            const {type, widget, subjectTypeUUID, titleKey} = filter;
            const selectedValue = _.head(this.state.selectedCustomFilters[titleKey]);
            const requiredDateObject = {...selectedValue, subjectTypeUUID, titleKey};
            switch (type) {
                case(CustomFilter.type.RegistrationDate):
                case(CustomFilter.type.EnrolmentDate):
                case(CustomFilter.type.ProgramEncounterDate):
                case(CustomFilter.type.EncounterDate):
                    return widget === CustomFilter.widget.Range ?
                        this.dateFilterWithRange(filter, idx, requiredDateObject, false)
                        : this.dateConceptFilter(filter, idx, requiredDateObject, false);
                case(CustomFilter.type.GroupSubject):
                    return this.groupSubjectFilter(filter, idx);
                default:
                    return <View key={idx}/>
            }
        })
    };

    groupSubjectFilter(filter, idx) {
        const {titleKey, groupSubjectTypeUUID} = filter;
        const addressLevelUUIDs = _.get(this.props, 'addressLevelState', new AddressLevelsState()).selectedAddressLevelUUIDs;
        const valueLabelPairs = this.individualService.getAllBySubjectTypeUUID(groupSubjectTypeUUID)
            .filter(subject => !_.isEmpty(addressLevelUUIDs) ? _.includes(addressLevelUUIDs, subject.lowestAddressLevel.uuid) : true)
            .map((subject) => new RadioLabelValue(`${subject.nameString} (${subject.lowestAddressLevel.translatedFieldValue})`, subject.uuid));
        const selectedGroupSubjectUUIDs = _.map(this.state.selectedCustomFilters[titleKey], ({groupSubjectUUID}) => groupSubjectUUID);
        return this.wrap(<View style={{flexDirection: 'column'}}>
            <RadioGroup
                multiSelect={true}
                inPairs={true}
                onPress={({label, value}) => this.onGroupSubjectChange(label, value, filter)}
                selectionFn={(groupSubjectUUID) => _.includes(selectedGroupSubjectUUIDs, groupSubjectUUID)}
                labelKey={titleKey}
                labelValuePairs={valueLabelPairs}/>
        </View>, idx);
    };

    timeConceptFilter(filter, idx, timeObject) {
        return this.wrap(<View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
            <Text style={Styles.formLabel}>{this.I18n.t(filter.titleKey)}</Text>
            {this.timeInput({
                ...timeObject,
                value: timeObject.minValue
            }, CustomFilterNames.ON_MIN_TIME_CUSTOM_FILTER_SELECT)}
        </View>, idx)
    }

    timeRangeFilter(filter, idx, timeObject) {
        return this.wrap(<View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
            <Text style={Styles.formLabel}>{this.I18n.t(filter.titleKey)}</Text>
            <View key={idx} style={{flexDirection: 'row', marginRight: 10, alignItems: 'center', flexWrap: 'wrap'}}>
                <Text style={Styles.formLabel}>{this.I18n.t('between')}</Text>
                {this.timeInput({
                    ...timeObject,
                    value: timeObject.minValue
                }, CustomFilterNames.ON_MIN_TIME_CUSTOM_FILTER_SELECT)}
                <Text style={Styles.formLabel}>{this.I18n.t('and')}</Text>
                {this.timeInput({
                    ...timeObject,
                    value: timeObject.maxValue
                }, CustomFilterNames.ON_MAX_TIME_CUSTOM_FILTER_SELECT)}
            </View>
        </View>, idx)
    }

    timeInput(timeObject, action) {
        return <TimePicker timeValue={timeObject && timeObject.value}
                           actionObject={timeObject || {}}
                           actionName={action}/>
    }

    dateConceptFilter(filter, idx, dateObject, pickTime) {
        return this.wrap(<View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
            <Text style={Styles.formLabel}>{this.I18n.t(filter.titleKey)}</Text>
            {this.dateInput({
                ...dateObject,
                value: dateObject.minDate
            }, pickTime, CustomFilterNames.ON_MIN_DATE_CUSTOM_FILTER_SELECT)}
        </View>, idx)
    }

    dateMismatchError({minDate, maxDate}) {
        return moment(minDate).isSameOrBefore(maxDate) ? null : {messageKey: 'startDateGreaterThanEndError'};
    }

    dateNotPresentError({minDate, maxDate}) {
        return (minDate && _.isNil(maxDate)) || (maxDate && _.isNil(minDate)) ? {messageKey: 'bothDateShouldBeSelectedError'} : null;
    }

    dateValidationError(dateObject) {
        return this.dateNotPresentError(dateObject) || this.dateMismatchError(dateObject);
    }

    dateFilterWithRange(filter, idx, dateObject, pickTime) {
        return this.wrap(<View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
            <Text style={Styles.formLabel}>{this.I18n.t(filter.titleKey)}</Text>
            <View key={idx} style={{flexDirection: 'row', marginRight: 10, alignItems: 'center', flexWrap: 'wrap'}}>
                <Text style={Styles.formLabel}>{this.I18n.t('between')}</Text>
                {this.dateInput({
                    ...dateObject,
                    value: dateObject.minDate,
                    validationCb: (dateObject) => this.dateValidationError(dateObject)
                }, pickTime, CustomFilterNames.ON_MIN_DATE_CUSTOM_FILTER_SELECT, 'startDate', true)}
                <Text style={Styles.formLabel}>{this.I18n.t('and')}</Text>
                {this.dateInput({
                    ...dateObject,
                    value: dateObject.maxDate,
                    isMaxDate: true,
                    validationCb: (dateObject) => this.dateValidationError(dateObject)
                }, pickTime, CustomFilterNames.ON_MAX_DATE_CUSTOM_FILTER_SELECT, 'endDate')}
            </View>
            <ValidationErrorMessage validationResult={this.dateValidationError(dateObject)}/>
        </View>, idx)
    }

    dateInput(dateObject, pickTime, actionName, noDateMessageKey, nonRemovable) {
        return <DatePicker
            nonRemovable={nonRemovable}
            actionName={actionName}
            actionObject={dateObject}
            pickTime={pickTime}
            dateValue={typeof dateObject.value === 'string' ? new Date(dateObject.value) : dateObject.value}
            noDateMessageKey={noDateMessageKey}/>
    }

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
            {this.numericInput(props, value && value.minValue, (value) => this.onNumericChange({minValue: value.replace(/[^0-9.]/g, '')}, filter))}
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
            <View key={idx} style={{flexDirection: 'row', marginRight: 10, alignItems: 'center', flexWrap: 'wrap'}}>
                <Text style={[Styles.formLabel, {paddingBottom: 10}]}>{this.I18n.t('between')}</Text>
                {this.numericInput(props, value && value.minValue, (value) => this.onNumericChange({minValue: value.replace(/[^0-9.]/g, '')}, filter))}
                <Text style={[Styles.formLabel, {paddingBottom: 10}]}>{this.I18n.t('and')}</Text>
                {this.numericInput(props, value && value.maxValue, (value) => this.onNumericChange({maxValue: value.replace(/[^0-9.]/g, '')}, filter))}
            </View>
        </View>, idx)
    }

    dispatchCodedAction(conceptAnswerName, conceptAnswers) {
        this.dispatchAction(CustomFilterNames.ON_CODED_CUSTOM_FILTER_SELECT,
            {
                titleKey: filter.titleKey,
                subjectTypeUUID: filter.subjectTypeUUID,
                conceptAnswerName,
                conceptAnswers
            });
    }

    codedConceptFilter(concept, filter, idx) {
        const locale = this.getService(UserInfoService).getUserSettings().locale;
        const conceptAnswers = concept.getAnswers();
        const selectedOne = this.state.selectedCustomFilters[filter.titleKey].map(c => c.name);
        const optsFnMap = conceptAnswers.reduce((conceptMap, conceptAnswers) => conceptMap.set(conceptAnswers.concept.name, conceptAnswers), new Map());
        const filterModel = new MultiSelectFilterModel(filter.titleKey, optsFnMap, new Map(), selectedOne).selectOption(selectedOne);
        return this.wrap(<MultiSelectFilter filter={filterModel}
                                   locale={locale}
                                   I18n={this.I18n}
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
        return (<View>
                {this.renderConceptFilters(_.filter(this.props.filters, filter => filter.type === CustomFilter.type.Concept))}
                {this.renderOtherFilters(_.filter(this.props.filters, filter => filter.type !== CustomFilter.type.Concept))}
            </View>
        );
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
