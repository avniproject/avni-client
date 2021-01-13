import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, TouchableNativeFeedback, View} from "react-native";
import React from "react";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";

export default class CustomDashboardCard extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return "CustomDashboardCard";
    }

    componentWillMount() {
        super.componentWillMount();
    }

    background() {
        return TouchableNativeFeedback.SelectableBackground();
    }

    render() {
        const {name, colour, count, uuid} = this.props.reportCard;
        return <TouchableNativeFeedback onPress={() => this.props.onCardPress(uuid)} background={this.background()}>
            <View id={uuid} style={{
                elevation: 2,
                backgroundColor: Colors.cardBackgroundColor,
                marginVertical: 3,
                marginHorizontal: 3,
            }}>
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    height: 100,
                }}>
                    <View style={{
                        paddingHorizontal: 10,
                        width: '75%',
                        alignSelf: 'center'
                    }}>
                        <Text style={{
                            fontSize: Styles.normalTextSize
                        }}>{name}</Text>
                    </View>
                    <View style={{backgroundColor: colour, width: '25%', paddingVertical: 1}}>
                        <View
                            style={{
                                alignSelf: 'center'
                            }}>
                            <Text style={{
                                paddingVertical: 25,
                                fontSize: 30,
                                fontWeight: 'bold',
                            }}>
                                {count}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableNativeFeedback>
    }

}
