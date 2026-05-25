import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import moment from "moment";

class DayStatusBanner extends AbstractComponent {
    static propTypes = {
        // Canonical "YYYY-MM-DD" string — the attendance flow is time/timezone agnostic.
        selectedDate: PropTypes.string.isRequired,
        dayType: PropTypes.string,
        marker: PropTypes.object,
        onMarkAnyway: PropTypes.func,
    };

    constructor(props, context) {
        super(props, context);
    }

    _statusLine() {
        const {dayType, marker} = this.props;
        const markerName = marker && marker.name;
        switch (dayType) {
            case "working_day":       return this.I18n.t("dayStatusWorking");
            case "weekly_off":        return this.I18n.t("dayStatusWeeklyOff");
            case "public_holiday":    return this.I18n.t("dayStatusPublicHoliday", {name: markerName || ""});
            case "working_override":  return this.I18n.t("dayStatusWorkingOverride", {name: markerName || ""});
            default:                  return "";
        }
    }

    render() {
        const {selectedDate, dayType, onMarkAnyway} = this.props;
        const m = moment.utc(selectedDate, "YYYY-MM-DD");
        const isToday = selectedDate === moment().format("YYYY-MM-DD");
        const dateLine = m.format("ddd D MMM YYYY");
        const statusLine = this._statusLine();
        const isHolidayLike = dayType === "weekly_off" || dayType === "public_holiday";

        return (
            <View>
                {!isToday && (
                    <View style={styles.retroBanner}>
                        <Text style={styles.retroText}>
                            {this.I18n.t("markRetroactively", {date: dateLine})}
                        </Text>
                    </View>
                )}
                <View style={[styles.dayBanner, isHolidayLike && styles.dayBannerOff]}>
                    <View style={{flex: 1}}>
                        <Text style={styles.dateText}>{dateLine}</Text>
                        {!!statusLine && <Text style={styles.statusText}>{statusLine}</Text>}
                    </View>
                    {isHolidayLike && !!onMarkAnyway && (
                        <TouchableOpacity onPress={onMarkAnyway} style={styles.markAnywayCta}>
                            <Text style={styles.markAnywayText}>
                                {this.I18n.t("markAnyway")} →
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    retroBanner: {
        backgroundColor: '#FFF3E0',
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    retroText: {color: '#E65100', fontSize: Styles.smallTextSize},
    dayBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: Colors.WhiteContentBackground,
        borderBottomWidth: 1,
        borderBottomColor: Colors.InputBorderNormal,
    },
    dayBannerOff: {backgroundColor: Colors.GreyBackground},
    dateText: {fontSize: Styles.titleSize || 16, fontWeight: 'bold', color: Colors.InputNormal},
    statusText: {fontSize: Styles.smallTextSize, color: Colors.SubheaderColor || '#666', marginTop: 2},
    markAnywayCta: {paddingVertical: 6, paddingHorizontal: 10},
    markAnywayText: {color: Colors.ActionButtonColor, fontSize: Styles.smallTextSize},
});

export default DayStatusBanner;
