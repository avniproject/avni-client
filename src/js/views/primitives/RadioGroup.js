import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import DynamicGlobalStyles from "./DynamicGlobalStyles";
import {Text, Grid, Row, Radio} from "native-base";

class RadioGroup extends AbstractComponent {
    static propTypes = {
        action: React.PropTypes.string.isRequired,
        labelKey: React.PropTypes.string.isRequired,
        labelValuePairs: React.PropTypes.array.isRequired,
        selectionFn: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <Grid>
                <Row style={{height: 28}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t(this.props.labelKey)}</Text>
                </Row>
                {this.props.labelValuePairs.map((radioLabelValue) => {
                    return (
                        <Row style={{height: 22, marginVertical: DynamicGlobalStyles.resizeHeight(8)}}>
                            <View style={{flexDirection: 'column-reverse'}}>
                                <Radio selected={this.props.selectionFn(radioLabelValue.value)}
                                       onPress={() => this.dispatchAction(this.props.action, {value: radioLabelValue.value})}/>
                            </View>
                            <Text style={DynamicGlobalStyles.formRadioText}>{this.I18n.t(radioLabelValue.radioLabel)}</Text>
                        </Row>);
                })}
            </Grid>
        );
    }
}

export class RadioLabelValue {
    constructor(radioLabel, value) {
        this.radioLabel = radioLabel;
        this.value = value;
    }
}

export default RadioGroup;