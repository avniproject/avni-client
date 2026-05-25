import React from "react";
import {Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import moment from "moment";

// Indicators on each cell stack independently so a working_override day that's
// already been marked still shows its attendance dot.
//   green dot       = at least one Held session
//   grey dot        = at least one DidntHappen, no Held
//   mixed (both)    = both Held and DidntHappen markers visible
//   red dot         = public_holiday
//   shaded cell     = weekly_off
//   green diamond   = working_override (region-wide make-up day)
class HorizontalDateStrip extends AbstractComponent {
    static propTypes = {
        // Canonical "YYYY-MM-DD" strings. Attendance dates are time- and
        // timezone-agnostic across this flow — no JS Date round-trips.
        dates: PropTypes.arrayOf(PropTypes.string).isRequired,
        // Map<YYYY-MM-DD, { dayType, marker?, held: string[], didntHappen: string[] }>
        statusByDate: PropTypes.object.isRequired,
        selectedDate: PropTypes.string.isRequired,
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

    _renderAttendanceDots(status) {
        const hasHeld = (status.held || []).length > 0;
        const hasDidntHappen = (status.didntHappen || []).length > 0;
        if (hasHeld && hasDidntHappen) return (
            <View style={{flexDirection: 'row'}}>
                <View style={[styles.dot, styles.dotMixed, {backgroundColor: Colors.ActionButtonColor}]}/>
                <View style={[styles.dot, styles.dotMixed, {backgroundColor: '#9e9e9e'}]}/>
            </View>
        );
        if (hasHeld) return <View style={[styles.dot, {backgroundColor: Colors.ActionButtonColor}]}/>;
        if (hasDidntHappen) return <View style={[styles.dot, {backgroundColor: '#9e9e9e'}]}/>;
        return null;
    }

    _renderDayTypeMarker(status) {
        if (status.dayType === "public_holiday") return <View style={[styles.dot, {backgroundColor: Colors.ValidationError}]}/>;
        if (status.dayType === "working_override") return <View style={[styles.diamond, {backgroundColor: Colors.ActionButtonColor}]}/>;
        return null;
    }

    _renderIndicator(status) {
        if (!status) return <View style={styles.indicatorPlaceholder}/>;
        const dayTypeMarker = this._renderDayTypeMarker(status);
        const attendanceDots = this._renderAttendanceDots(status);
        if (!dayTypeMarker && !attendanceDots) return <View style={styles.indicatorPlaceholder}/>;
        return (
            <View style={styles.indicatorRow}>
                {dayTypeMarker}
                {dayTypeMarker && attendanceDots && <View style={styles.indicatorSpacer}/>}
                {attendanceDots}
            </View>
        );
    }

    // Best-effort: size cells so ~7 days span the current screen width. Computed
    // per render (Dimensions at module load can be 0/unmeasured, which crammed all
    // 14 cells onto one screen).
    _cellWidth() {
        const screenWidth = Dimensions.get("window").width || 360;
        return Math.max(40, Math.floor((screenWidth - STRIP_PADDING * 2) / VISIBLE_CELLS) - CELL_MARGIN * 2);
    }

    _renderCell(dateKey, cellWidth) {
        const status = this.props.statusByDate.get(dateKey);
        const isSelected = this.props.selectedDate === dateKey;
        const isWeeklyOff = status && status.dayType === "weekly_off";
        // moment.utc avoids any local-tz drift when parsing the canonical key.
        const m = moment.utc(dateKey, "YYYY-MM-DD");
        const isToday = dateKey === moment().format("YYYY-MM-DD");

        return (
            <TouchableOpacity
                key={dateKey}
                onPress={() => this.props.onSelect(dateKey)}
                style={[
                    styles.cell,
                    {width: cellWidth},
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
        const cellWidth = this._cellWidth();
        return (
            <ScrollView
                ref={this._scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.strip}>
                {dates.map(d => this._renderCell(d, cellWidth))}
            </ScrollView>
        );
    }
}

const STRIP_PADDING = 8;
const CELL_MARGIN = 4;
const VISIBLE_CELLS = 7;
const styles = StyleSheet.create({
    strip: {paddingVertical: 8, paddingHorizontal: STRIP_PADDING},
    cell: {
        marginHorizontal: CELL_MARGIN,
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
    indicatorRow: {flexDirection: 'row', alignItems: 'center', marginTop: 6, height: 8},
    indicatorSpacer: {width: 3},
    indicatorPlaceholder: {height: 8, marginTop: 6},
    dot: {width: 8, height: 8, borderRadius: 4},
    dotMixed: {marginHorizontal: 1},
    diamond: {width: 8, height: 8, transform: [{rotate: '45deg'}]},
});

export default HorizontalDateStrip;
