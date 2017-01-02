import {Text, StyleSheet, View, TouchableHighlight, TextInput} from 'react-native';
import React, {Component} from 'react';
import AppState from "../../hack/AppState";
import MessageService from "../../service/MessageService";
import GlobalStyles from "../primitives/GlobalStyles";

class DurationComponent extends Component {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();

        this.onMonthPress = this.onMonthPress.bind(this);
        this.onYearPress = this.onYearPress.bind(this);
        this.onTextChange = this.onTextChange.bind(this);
    }

    static propTypes = {
        styles: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        main: {
            flex: 1,
            flexDirection: 'row'
        },
        textInput: {
            padding: 5,
            borderColor: '#000000',
            borderStyle: 'solid',
            borderWidth: 2,
            fontSize: 24,
            flex: 0.33,
        },
        durationButtonWrapper: {
            height: 50,
            borderWidth: 2
        },
        durationButtonTouchable: {
            flex: 0.33
        },
        durationLeftButtonWrapper: {
            borderTopLeftRadius: 5,
            borderBottomLeftRadius: 5
        },
        durationRightButtonWrapper: {
            borderTopRightRadius: 5,
            borderBottomRightRadius: 5
        },
        durationButton: {
            flex: 1
        },
        pressedButtonWrapper: {
            borderColor: '#616161'
        },
        notPressedButtonWrapper: {
            borderColor: '#f5f5f5'
        },
        pressedButton: {
            backgroundColor: '#616161',
            color: "#f5f5f5"
        },
        notPressedButton: {
            backgroundColor: '#f5f5f5',
            color: "#e0e0e0"
        }
    });

    onMonthPress() {
        AppState.questionnaireAnswers.currentAnswer.value.setAsMonths();
        this.setState({});
    }

    onYearPress() {
        AppState.questionnaireAnswers.currentAnswer.value.setAsYears();
        this.setState({});
    }

    onTextChange(text) {
        AppState.questionnaireAnswers.currentAnswer.value.durationValue = text;
    }

    render() {
        const duration = AppState.questionnaireAnswers.currentAnswer.value;

        const monthButtonStyle = duration.isInMonths ? DurationComponent.styles.pressedButton : DurationComponent.styles.notPressedButton;
        const yearButtonStyle = duration.isInYears ? DurationComponent.styles.pressedButton : DurationComponent.styles.notPressedButton;

        const monthButtonWrapperStyle = duration.isInMonths ? DurationComponent.styles.pressedButtonWrapper : DurationComponent.styles.notPressedButtonWrapper;
        const yearButtonWrapperStyle = duration.isInYears ? DurationComponent.styles.pressedButtonWrapper : DurationComponent.styles.notPressedButtonWrapper;

        return (
            <View style={DurationComponent.styles.main}>
                <TextInput onChangeText={this.onTextChange}
                           style={DurationComponent.styles.textInput}
                           keyboardType='numeric'
                           autoFocus={true}>{duration.durationValueAsString}</TextInput>
                <TouchableHighlight style={DurationComponent.styles.durationButtonTouchable}>
                    <View style={[DurationComponent.styles.durationButtonWrapper, DurationComponent.styles.durationLeftButtonWrapper, monthButtonWrapperStyle]}>
                        <Text onPress={this.onMonthPress}
                              style={[GlobalStyles.toggleButton, monthButtonStyle, DurationComponent.styles.durationButton]}>{this.I18n.t("months")}</Text>
                    </View>
                </TouchableHighlight>
                <TouchableHighlight style={DurationComponent.styles.durationButtonTouchable}>
                    <View style={[DurationComponent.styles.durationButtonWrapper, DurationComponent.styles.durationRightButtonWrapper, yearButtonWrapperStyle]}>
                        <Text onPress={this.onYearPress}
                              style={[GlobalStyles.toggleButton, yearButtonStyle, DurationComponent.styles.durationButton]}>{this.I18n.t("years")}</Text>
                    </View>
                </TouchableHighlight>
            </View>);
    }
}

export default DurationComponent;