import React from 'react';
import {
    SafeAreaView,
    StyleSheet,
    View,
} from 'react-native';
import PropTypes from "prop-types";
import Colors from "../../primitives/Colors";
import ValidationErrorMessage from "../ValidationErrorMessage";
import FileFormElement from "./FileFormElement";
import {Button, Text} from "native-base";
import Fonts from "../../primitives/Fonts";
import Styles from "../../primitives/Styles";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";

class MultiSelectFileFormElement extends FileFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {};
    }

    get mediaUris() {
        const answer = _.get(this, 'props.value.answer', []);
        return _.flatten([answer]);
    }

    UNSAFE_componentWillMount() {
        const initialCount = _.max([1, _.size(this.mediaUris)]);
        this.setState({mediaCount: initialCount});
        return super.UNSAFE_componentWillMount();
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
                <View style={styles.lineStyle}/>
            </View>
        );
    }

    onAdd() {
        this.setState(({mediaCount}) => ({mediaCount: mediaCount + 1}))
    }

    render() {
        const isDisabled = _.size(this.mediaUris) !== this.state.mediaCount;
        return (
            <SafeAreaView style={{marginVertical: 16}}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {_.map(_.range(0, this.state.mediaCount), index => this.renderMedia(index))}
                <Button disabled={isDisabled}
                        style={{
                            height: 22,
                            backgroundColor: isDisabled ? Colors.DisabledButtonColor : Colors.ActionButtonColor,
                            alignSelf: 'flex-end',
                            marginTop: 10,
                        }}
                        onPress={() => this.onAdd()}>
                    <Text style={{fontSize: Fonts.Normal, color: Styles.whiteColor}}>{this.I18n.t('addMore')}</Text>
                </Button>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </SafeAreaView>
        );
    }
}

export default MultiSelectFileFormElement;

const styles = StyleSheet.create({
    lineStyle: {
        flex: 1,
        borderColor: Colors.BlackBackground,
        borderBottomWidth: StyleSheet.hairlineWidth,
        opacity: 0.1
    }
});
