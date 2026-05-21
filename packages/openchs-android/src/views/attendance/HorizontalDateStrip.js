import React from "react";
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import moment from "moment";
import {DateTimeUtil} from "openchs-models";

// dot styling per dayType + Held/DidntHappen mix. Order matches the spec:
//   green dot       = at least one Held session
//   grey dot        = at least one DidntHappen, no Held
//   mixed (both)    = both Held and DidntHappen markers visible
//   red dot         = public_holiday
//   shaded cell     = weekly_off
//   green diamond   = working_override (region-wide make-up day)
class HorizontalDateStrip extends AbstractComponent {
    static propTypes = {
        dates: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired,
        // Map<YYYY-MM-DD, { dayType, marker?, held: string[], didntHappen: string[] }>
        statusByDate: PropTypes.object.isRequired,
        selectedDate: PropTypes.instanceOf(Date).isRequired,
        onSelect: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        this._scrollRef = React.createRef();
    }

    componentDidMount() {
        // Today sits at the end of the strip window — scroll there once on mount
        // so it lands in view. ScrollView measures synchronously, but the actual
        // scroll has to wait for layout, so defer one tick.
        setTimeout(() => {
            this._scrollRef.current && this._scrollRef.current.scrollToEnd({animated: false});
        }, 0);
    }

    _dateKey(d) {
        return DateTimeUtil.toCalendarDateString(d);
    }

    _renderIndicator(status) {
        if (!status) return <View style={styles.indicatorPlaceholder}/>;
        const hasHeld = (status.held || []).length > 0;
        const hasDidntHappen = (status.didntHappen || []).length > 0;
        if (status.dayType === "working_override") return <View style={[styles.indicator, styles.diamond, {backgroundColor: Colors.ActionButtonColor}]}/>;
        if (status.dayType === "public_holiday") return <View style={[styles.indicator, styles.dot, {backgroundColor: Colors.ValidationError}]}/>;
        if (hasHeld && hasDidntHappen) return (
            <View style={{flexDirection: 'row'}}>
                <View style={[styles.indicator, styles.dot, styles.dotMixed, {backgroundColor: Colors.ActionButtonColor}]}/>
                <View style={[styles.indicator, styles.dot, styles.dotMixed, {backgroundColor: '#9e9e9e'}]}/>
            </View>
        );
        if (hasHeld) return <View style={[styles.indicator, styles.dot, {backgroundColor: Colors.ActionButtonColor}]}/>;
        if (hasDidntHappen) return <View style={[styles.indicator, styles.dot, {backgroundColor: '#9e9e9e'}]}/>;
        return <View style={styles.indicatorPlaceholder}/>;
    }

    _renderCell(date) {
        const key = this._dateKey(date);
        const status = this.props.statusByDate.get(key);
        const isSelected = this._dateKey(this.props.selectedDate) === key;
        const isWeeklyOff = status && status.dayType === "weekly_off";
        const m = moment(date);
        const isToday = m.isSame(moment().startOf("day"), "day");

        return (
            <TouchableOpacity
                key={key}
                onPress={() => this.props.onSelect(date)}
                style={[
                    styles.cell,
                    isWeeklyOff && styles.cellWeeklyOff,
                    isSelected && styles.cellSelected,
                ]}>
                <Text style={[styles.weekday, isSelected && styles.weekdaySelected]}>
                    {isToday ? this.I18n.t("today").toUpperCase() : m.format("ddd").toUpperCase()}
                </Text>
                <Text style={[styles.day, isSelected && styles.daySelected]}>
                    {m.format("D")}
                </Text>
                {this._renderIndicator(status)}
            </TouchableOpacity>
        );
    }

    render() {
        const {dates} = this.props;
        return (
            <ScrollView
                ref={this._scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.strip}>
                {dates.map(d => this._renderCell(d))}
            </ScrollView>
        );
    }
}

const CELL_WIDTH = 52;
const styles = StyleSheet.create({
    strip: {paddingVertical: 8, paddingHorizontal: 8},
    cell: {
        width: CELL_WIDTH,
        marginHorizontal: 4,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: Colors.WhiteContentBackground,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal,
    },
    cellWeeklyOff: {backgroundColor: Colors.GreyBackground},
    cellSelected: {backgroundColor: Colors.ActionButtonColor, borderColor: Colors.ActionButtonColor},
    weekday: {fontSize: Styles.smallTextSize, color: Colors.SubheaderColor || '#666'},
    weekdaySelected: {color: Colors.TextOnPrimaryColor, fontWeight: 'bold'},
    day: {fontSize: 18, color: Colors.InputNormal, marginTop: 2},
    daySelected: {color: Colors.TextOnPrimaryColor, fontWeight: 'bold'},
    indicator: {marginTop: 6},
    indicatorPlaceholder: {height: 8, marginTop: 6},
    dot: {width: 8, height: 8, borderRadius: 4},
    dotMixed: {marginHorizontal: 1},
    diamond: {width: 8, height: 8, transform: [{rotate: '45deg'}]},
});

export default HorizontalDateStrip;
