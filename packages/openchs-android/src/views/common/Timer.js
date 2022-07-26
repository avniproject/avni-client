import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import {Button, Icon} from "native-base";
import _ from "lodash";
import KeepAwake from "react-native-keep-awake";
import Styles from "../primitives/Styles";
import BackgroundTimer from "react-native-background-timer";
import Colors from "../primitives/Colors";

class Timer extends AbstractComponent {
    static propTypes = {
        timerState: PropTypes.object.isRequired,
        onStartTimer: PropTypes.func.isRequired,
        group: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    componentWillUnmount() {
        setTimeout(() => BackgroundTimer.stopBackgroundTimer(), 0);
        super.componentWillUnmount();
    };

    renderStartButton() {
        const {height} = Dimensions.get('window');
        return (
            <View style={[styles.buttonContainer, {marginTop: height / 2.5}]}>
                <View style={{alignItems: 'center', justifyContent: 'center'}}>
                    <Button onPress={() => this.props.onStartTimer()} style={{padding: 35, borderRadius: 20}}>
                        <Text>{this.I18n.t('start')}</Text>
                    </Button>
                </View>
            </View>
        )
    }

    renderTimer() {
        const {height} = Dimensions.get('window');
        const {countUpTime, countDownTime} = this.props.timerState.displayObject();
        const displayMessage = !this.props.timerState.displayQuestions;
        const backgroundColor = this.props.group.backgroundColour || '#ffffff';
        const color = this.props.group.textColour || Colors.InputNormal;
        return (
            <React.Fragment>
                <KeepAwake/>
                <View style={styles.container}>
                    <View style={styles.timerStyle}>
                        <Icon style={{fontSize: 30, marginRight: 8}} name="av-timer" type="MaterialIcons"/>
                        <Text style={Styles.timerStyle}>{countUpTime}</Text>
                    </View>
                    {countDownTime ?
                        <View style={[styles.timerStyle, {backgroundColor}]}>
                            <Icon style={{fontSize: 30, marginRight: 8, color}} name="stopwatch" type="Entypo"/>
                            <Text style={[Styles.timerStyle, {color}]}>{countDownTime}</Text>
                        </View> : null}
                </View>
                {displayMessage &&
                <View style={[styles.buttonContainer, {marginTop: height / 3}]}>
                    <View style={{alignItems: 'center', justifyContent: 'center'}}>
                        <Text style={Styles.menuTitle}>{this.I18n.t('observationInProgress')}</Text>
                    </View>
                </View>}
            </React.Fragment>
        )
    }

    render() {
        const timerState = this.props.timerState;
        return _.get(timerState, 'startTimer', false) ? this.renderTimer() : this.renderStartButton();
    }
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    timerStyle: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: Colors.DisabledButtonColor,
        flexDirection: 'row',
        alignItems: 'center'
    },
    buttonContainer: {
        flexDirection: 'column',
        flexWrap: 'nowrap',
        alignItems: 'center',
    }
});

export default Timer
