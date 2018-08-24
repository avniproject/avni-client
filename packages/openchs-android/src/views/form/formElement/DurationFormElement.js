import {Text, TextInput, View} from "react-native";
import React from "react";
import {Radio} from "native-base";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import DGS from "../../primitives/DynamicGlobalStyles";
import Colors from '../../primitives/Colors';
import Distances from "../../primitives/Distances";
import Styles from "../../primitives/Styles";

class DurationFormElement extends AbstractFormElement {
    static propTypes = {
        label: React.PropTypes.string.isRequired,
        actionName: React.PropTypes.string.isRequired,
        duration: React.PropTypes.object.isRequired,
        noDateMessageKey: React.PropTypes.string.isRequired,
        durationOptions: React.PropTypes.array.isRequired,
        validationResult: React.PropTypes.object,
        element: React.PropTypes.object.isRequired,
        dateValue: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        let labelText = this.label;
        console.log(this.props.duration);
        return (
            <View>
                <View style={{backgroundColor: '#ffffff', borderStyle: 'dashed'}}>
                    <Text style={Styles.formLabel}>{labelText}</Text>
                </View>
                <View style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: Colors.InputBorderNormal,
                    paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                    paddingVertical: 5
                }}>
                    <View style={[{flexDirection: 'row'}]}>
                        <Text style={Styles.formLabel}>{`${this.I18n.t("enterDuration")}: `}</Text>
                        <TextInput style={[Styles.formBodyText, {
                            paddingBottom: 5,
                            paddingTop: 0,
                            marginBottom: 5,
                            width: 80,
                            color: Colors.InputNormal
                        }]}
                                   keyboardType='numeric'
                                   underlineColorAndroid={this.borderColor}
                                   value={_.isNil(this.props.duration) ? "" : _.toString(this.props.duration.durationValue)}
                                   onChangeText={(text) => this.dispatchAction(this.props.actionName, {
                                       formElement: this.props.element,
                                       duration: this.props.duration.changeValue(text)
                                   })}/>
                        {this.props.durationOptions.map((durationOption, index) => {
                            return <View key={index} style={{flexDirection: 'row'}}>
                                <Radio style={{marginLeft: DGS.resizeWidth(20)}}
                                       selected={durationOption === this.props.duration.durationUnit}
                                       onPress={() => this.dispatchAction(this.props.actionName, {
                                           formElement: this.props.element,
                                           duration: this.props.duration.changeUnit(durationOption)
                                       })}/>
                                <Text style={DGS.formRadioText}>{this.I18n.t(durationOption)}</Text>
                            </View>
                        })}

                    </View>
                </View>
            </View>
        );
    }
}

export default DurationFormElement;