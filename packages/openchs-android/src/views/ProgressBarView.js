import {ProgressBarAndroid, Text, View} from "react-native";
import Fonts from "./primitives/Fonts";
import React from "react";
import Colors from "./primitives/Colors";
import _ from "lodash";
import AbstractComponent from "../framework/view/AbstractComponent";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

class ProgressBarView extends AbstractComponent {
    static propType = {
        progressBar: React.PropTypes.func,
        progressMessage: React.PropTypes.func,
        onProgressComplete: React.PropTypes.func
    };

    constructor(props, context) {
        super(props, context);
        this.state = {value: 0, syncMessage: '', complete: false};
        this.createStyles();
        this.props.progressBar(this);
        this.props.progressMessage(this)
    }

    update(value) {
        this.setState({value});
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.value === 1) {
            setTimeout(this.props.onProgressComplete, 500);
        }
    }

    messageCallBack(syncMessage) {
        this.setState({syncMessage});
    }

    createStyles() {
        this.container = {
            flexDirection: 'row',
            flexWrap: 'nowrap',
            justifyContent: 'center',
            alignItems: 'center',
        };
        this.syncTextContent = {
            color: Colors.TextOnPrimaryColor,
            lineHeight: 20,
            height: 40,
        };
        this.percentageText = {
            color: Colors.TextOnPrimaryColor,
        };

    }

    render() {

        return (
            <View>
                {this.state.value < 1 ?

                    (<View>
                        <Text style={[this.syncTextContent, Fonts.typography("paperFontSubhead")]}>
                            {this.I18n.t(_.isNil(this.state.syncMessage) ? "doingNothing" : this.state.syncMessage)}
                        </Text>
                        <ProgressBarAndroid styleAttr="Horizontal" progress={this.state.value}
                                            indeterminate={false} color="white"/>
                        <Text
                            style={[this.percentageText, {textAlign: 'center'}, Fonts.typography("paperFontSubhead")]}>
                            {((this.state.value) * 100).toFixed(0)}%
                        </Text>
                    </View>)
                    :
                    (<View>
                        <View style={this.container}>
                            <Text style={[this.syncTextContent, Fonts.typography("paperFontSubhead")]}>
                                {this.I18n.t("syncComplete")}
                            </Text>
                            <Icon name='check-circle' size={25} style={[{color: Colors.TextOnPrimaryColor}]}/>
                        </View>
                        <ProgressBarAndroid styleAttr="Horizontal" progress={this.state.value}
                                            indeterminate={false} color="green"/>
                        <Text
                            style={[this.percentageText, {textAlign: 'center'}, Fonts.typography("paperFontSubhead")]}>
                            {((this.state.value) * 100).toFixed(0)}%
                        </Text>
                    </View>)}
            </View>
        );
    }
}

export default ProgressBarView
