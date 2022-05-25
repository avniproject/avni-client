import {StyleSheet, View} from "react-native";
import PropTypes from 'prop-types';
import React, {Fragment} from "react";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import MediaFormElement from "./MediaFormElement";
import Colors from "../../primitives/Colors";
import {Button, Icon, Text} from "native-base";
import Fonts from "../../primitives/Fonts";
import Styles from "../../primitives/Styles";

export default class MultiSelectMediaFormElement extends MediaFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
        extraStyle: PropTypes.object,
    };
    static defaultProps = {
        style: {},
    };

    constructor(props, context) {
        super(props, context);
        this.state = {};
    }

    get mediaUris() {
        const answer = _.get(this, 'props.value.answer', []);
        //this is done to support backward compatibility for the clients where app is not updated
        return _.flatten([answer]);
    }

    componentWillMount() {
        const initialCount = _.max([1, _.size(this.mediaUris)]);
        this.setState({mediaCount: initialCount});
        return super.componentWillMount();
    }

    clearAnswer(index) {
        const allAnswers = this.mediaUris;
        this.dismissKeyboard();
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            answerUUID: allAnswers[index],
        });
        this.setState(({mediaCount}) => ({mediaCount: _.max([1, mediaCount - 1])}))
    }

    onUpdateObservations(fileName) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            answerUUID: fileName
        });
    }

    renderMedia(index) {
        const currentMediaElement = this.mediaUris[index];
        return (
            <View key={index} style={{marginBottom: 3}}>
                {currentMediaElement ? this.showMedia(currentMediaElement, this.clearAnswer.bind(this, index)) :
                    this.showInputOptions(this.onUpdateObservations.bind(this))}
                <View
                    style={{flex: 1, borderColor: 'black', borderBottomWidth: StyleSheet.hairlineWidth, opacity: 0.1}}/>
            </View>
        );
    }

    onAdd() {
        this.setState(({mediaCount}) => ({mediaCount: mediaCount + 1}))
    }

    render() {
        return (
            <View style={{marginVertical: 16}}>
                {this.label}
                {_.map(_.range(0, this.state.mediaCount), index => this.renderMedia(index))}
                <Button style={{
                    height: 22,
                    backgroundColor: Colors.ActionButtonColor,
                    alignSelf: 'flex-end',
                    marginTop: 10,
                }}
                        onPress={() => this.onAdd()}>
                    <Text style={{fontSize: Fonts.Normal, color: Styles.whiteColor}}
                          onPress={() => this.onAdd()}>{this.I18n.t('addMore')}</Text>
                </Button>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        );
    }
}
