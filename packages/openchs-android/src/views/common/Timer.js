import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {View, Text, Modal} from 'react-native';
import {Button, Icon} from "native-base";
import _ from "lodash";
import KeepAwake from "react-native-keep-awake";
import Styles from "../primitives/Styles";
import BackgroundTimer from "react-native-background-timer";

class Timer extends AbstractComponent {
    static propTypes = {
        timerState: PropTypes.object.isRequired,
        onStartTimer: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    componentWillUnmount() {
        setTimeout(() => BackgroundTimer.stopBackgroundTimer(), 0);
        super.componentWillUnmount();
    };

    renderStartButton() {
        return (
            <Modal transparent={true}
                   onRequestClose={_.noop}
                   visible={!this.props.timerState.startTimer}
                   style={{marginTop: 40}}>
                <View style={{
                    flex: 1,
                    flexDirection: 'column',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    backgroundColor: 'rgba(68,68,68,0.25)'
                }}>
                    <View style={{flex: .5}}/>
                    <View style={{alignItems: 'center', justifyContent: 'center'}}>
                        <Button onPress={() => this.props.onStartTimer()} style={{padding: 35, borderRadius: 20}}>
                            <Text>{'Start'}</Text>
                        </Button>
                    </View>
                </View>
            </Modal>
        )
    }

    renderTimer() {
        return (
            <React.Fragment>
                <KeepAwake/>
                <View style={{alignItems: 'flex-end', justifyContent: 'flex-end'}}>
                    <View style={{
                        padding: 16,
                        backgroundColor: 'grey',
                        flexDirection: 'row',
                        alignItems: 'center',
                        elevation: 2
                    }}>
                        <Icon style={{fontSize: 30, marginRight: 8}} name="av-timer" type="MaterialIcons"/>
                        <Text style={Styles.timerStyle}>{this.props.timerState.displayString()}</Text>
                    </View>
                </View>
            </React.Fragment>
        )
    }

    render() {
        const timerState = this.props.timerState;
        return _.get(timerState, 'startTimer', false) ? this.renderTimer() : this.renderStartButton();
    }
}

export default Timer
