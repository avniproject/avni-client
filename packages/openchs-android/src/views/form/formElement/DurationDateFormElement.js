import {Text, TextInput, View} from "react-native";
import React from "react"; import PropTypes from 'prop-types';
import {Radio} from "native-base";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import DGS from "../../primitives/DynamicGlobalStyles";
import DatePicker from "../../primitives/DatePicker";
import Colors from '../../primitives/Colors';
import Distances from "../../primitives/Distances";

class DurationDateFormElement extends AbstractFormElement {
    static propTypes = {
        label: PropTypes.string.isRequired,
        actionName: PropTypes.string.isRequired,
        duration: PropTypes.object.isRequired,
        noDateMessageKey: PropTypes.string.isRequired,
        durationOptions: PropTypes.array.isRequired,
        validationResult: PropTypes.object,
        element: PropTypes.object.isRequired,
        dateValue : PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View style={{
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: Colors.InputBorderNormal,
                paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                paddingVertical: Distances.ScaledVerticalSpacingBetweenOptionItems
            }}>
                <View style={[this.formRow, {flexDirection: 'column'}]}>
                    <View>
                        <Text style={DGS.formElementLabel}>{`${this.I18n.t(this.props.label)} - ${this.I18n.t("date")}`}</Text>
                    </View>
                    <View style={{flexDirection: 'row'}}>
                        <DatePicker actionName={this.props.actionName} actionObject={{formElement: this.props.element}} validationResult={this.props.validationResult}
                                    dateValue={this.props.dateValue.getValue()} noDateMessageKey={this.props.noDateMessageKey}/>
                    </View>
                </View>
                <View style={[this.formRow, {flexDirection: 'column', marginTop: DGS.resizeHeight(12)}]}>
                    <Text style={DGS.formElementLabel}>{`${this.I18n.t(this.props.label)} - ${this.I18n.t("duration")}`}</Text>
                    <View style={{flexDirection: 'row'}}>
                        <TextInput style={{flex: 1, borderBottomWidth: 0, marginVertical: 0, paddingVertical: 5}}
                                   keyboardType='numeric'
                                   underlineColorAndroid={this.borderColor}
                                   value={_.isNil(this.props.duration) ? "" : _.toString(this.props.duration.durationValue)}
                                   onChangeText={(text) => this.dispatchAction(this.props.actionName, {
                                       formElement: this.props.element,
                                       duration: this.props.duration.changeValue(text)
                                   })}/>
                        {this.props.durationOptions.map((durationOption, index) => {
                            return <View key={index} style={{flexDirection: 'row'}}>
                                <View style={{flexDirection: 'column-reverse', marginLeft: DGS.resizeWidth(20)}}>
                                    <Radio selected={durationOption === this.props.duration.durationUnit}
                                           onPress={() => this.dispatchAction(this.props.actionName, {
                                               formElement: this.props.element,
                                               duration: this.props.duration.changeUnit(durationOption)
                                           })}/>
                                </View>
                                <View style={{flexDirection: 'column-reverse'}}>
                                    <Text style={DGS.formRadioText}>{this.I18n.t(durationOption)}</Text>
                                </View>
                            </View>
                        })}
                    </View>
                </View>
            </View>
        );
    }
}

export default DurationDateFormElement;