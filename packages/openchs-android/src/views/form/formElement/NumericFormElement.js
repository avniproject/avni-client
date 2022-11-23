import {TextInput, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import {Text} from "native-base";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import Styles from "../../primitives/Styles";
import Colors from "../../primitives/Colors";
import ValueSelectFormElement from "./ValueSelectFormElement";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";

class NumericFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        inputChangeActionName: PropTypes.string.isRequired,
        endEditingActionName: PropTypes.string,
        value: PropTypes.object,
        validationResult: PropTypes.object,
        containerStyle: PropTypes.object,
        labelStyle: PropTypes.object,
        inputStyle: PropTypes.object,
        allowedValues: PropTypes.array,
        isTableView: PropTypes.bool
    };

    constructor(props, context) {
        super(props, context);
        this.state = {
            value: ""
        };
        if (props.value.getValue() !== _.toNumber(props.value.getValue())) {
            this.state.value = _.toString(props.value.getValue());
        }
    }

    rangeText() {
        let rangeText = null;
        if (!_.isNil(this.props.element.concept.lowNormal)) {
            if (!_.isNil(this.props.element.concept.hiNormal)) {
                rangeText = `${this.props.element.concept.lowNormal} - ${this.props.element.concept.hiNormal}`;
            } else {
                rangeText = `>=${this.props.element.concept.lowNormal}`
            }
        } else if (!_.isNil(this.props.element.concept.hiNormal)) {
            rangeText = `=<${this.props.element.concept.hiNormal}`
        }
        return _.isNil(rangeText) ? <Text></Text> : <Text style={Styles.formLabel}> ({rangeText}) </Text>;
    }

    componentDidMount() {
        this.setState(() => ({
            value: _.toString(this.props.value.getValue())
        }));
    }

    unitText() {
        return _.isEmpty(this.props.element.concept.unit) ? <Text></Text> :
            <Text style={Styles.formLabel}> ({this.props.element.concept.unit}) </Text>;

    }

    onInputChange(text, convertToNumber) {
        this.setState(() => ({value: text}), () => {
            this.dispatchAction(this.props.inputChangeActionName, {
                formElement: this.props.element,
                value: text,
                parentFormElement: this.props.parentElement,
                questionGroupIndex: this.props.questionGroupIndex,
                convertToNumber
            });
        });
    }

    color() {
        if (_.isNil(this.props.value.getValue())) {
            return Colors.InputNormal;
        }
        return this.props.element.concept.isAbnormal(this.props.value.getValue()) ? Colors.AbnormalValueHighlight : Colors.InputNormal;
    }

    renderNormalView() {
        let rangeText = this.rangeText();
        let unitText = this.unitText();
        const containerStyle = _.get(this.props, 'containerStyle', {});
        const labelStyle = _.get(this.props, 'labelStyle', {});
        const inputStyle = _.get(this.props, 'inputStyle', {});
        return (
            <View style={containerStyle}>
                <View style={{backgroundColor: '#ffffff', borderStyle: 'dashed', borderRadius: 1, ...labelStyle}}>
                    <FormElementLabelWithDocumentation element={this.props.element} moreTextForLabel={<Text style={Styles.formLabel}>{unitText}{rangeText}</Text>} isTableView={this.props.isTableView}/>
                </View>
                <View style={inputStyle}>
                    {this.props.element.editable === false ?
                        <Text style={[{
                            flex: 1,
                            marginVertical: 0,
                            paddingVertical: 5
                        }, Styles.formBodyText, {color: this.color()}]}>{_.isNil(this.props.value.getValue()) ? this.I18n.t('Not Known Yet') : _.toString(this.props.value.getValue())}</Text> :
                        <View>
                            <TextInput style={[{
                                flex: 1,
                                marginVertical: 0,
                                paddingVertical: 5
                            }, Styles.formBodyText, {color: this.color()}]}
                                       underlineColorAndroid={this.borderColor} keyboardType='numeric'
                                       value={this.state.value}
                                       onChangeText={(text) => this.onInputChange(text)}
                                       onEndEditing={(event) => this.onInputChange(event.nativeEvent.text, true)}/>
                        </View>
                    }
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
            </View>
        );
    }

    renderOptionView() {
        return <ValueSelectFormElement
            onPress={(text) => this.onInputChange(text)}
            values={this.props.allowedValues}
            {...this.props}
        />
    }

    render() {
        return _.isNil(this.props.allowedValues) ? this.renderNormalView() : this.renderOptionView()
    }


}

export default NumericFormElement;
