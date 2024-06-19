import React from "react";
import {View} from "react-native";
import {Text} from "native-base";
import Styles from "../primitives/Styles";
import DatePicker from "../primitives/DatePicker";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import _ from 'lodash';
import Colors from "../primitives/Colors";
import {Range} from "openchs-models";

class DateRangeFilter extends AbstractComponent {
    static propTypes = {
        minValue: PropTypes.object,
        maxValue: PropTypes.object,
        pickTime: PropTypes.bool.isRequired,
        onChange: PropTypes.func,
        errorMessage: PropTypes.string
    }

    static defaultProps = {
        onChange: _.noop
    }

    render() {
        const {minValue, maxValue, pickTime, onChange, errorMessage} = this.props;

        return <View>
            <View style={{flexDirection: 'row', marginRight: 10, alignItems: 'center', flexWrap: 'wrap'}}>
                <Text style={Styles.formLabel}>{this.I18n.t('between')}</Text>
                <DatePicker pickTime={pickTime} dateValue={minValue} onChange={(value) => onChange(new Range(value, maxValue))}/>
                <Text style={Styles.formLabel}>{this.I18n.t('and')}</Text>
                <DatePicker pickTime={pickTime} dateValue={maxValue} onChange={(value) => onChange(new Range(minValue, value))}/>
            </View>
            {errorMessage && <Text style={{color: Colors.ValidationError, flex: 0.3}}>{this.I18n.t(errorMessage)}</Text>}
        </View>;
    }
}

export default DateRangeFilter;
