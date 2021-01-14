import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, TouchableNativeFeedback, View, ActivityIndicator} from "react-native";
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

    componentDidMount() {
        setTimeout(() => this.dispatchAction(this.props.executeQueryActionName, {reportCardUUID: this.props.reportCard.uuid}), 1000);
    }

    background() {
        return TouchableNativeFeedback.SelectableBackground();
    }

    renderNumber() {
        const count = this.props.reportCard.count;
        return (
            _.isNil(count) ? <ActivityIndicator size="large" color="#0000ff" style={{paddingVertical: 25}}/>
                :
                <Text style={{paddingVertical: 25, fontSize: 30, fontWeight: 'bold'}}>
                    {count}
                </Text>
        )
    }

    onCardPress() {
        return !_.isNil(this.props.reportCard.count) ? this.props.onCardPress(this.props.reportCard.uuid) : _.noop();
    }

    render() {
        const {name, colour, uuid} = this.props.reportCard;
        return <TouchableNativeFeedback onPress={this.onCardPress.bind(this)}
                                        background={this.background()}>
            <View style={{
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
                            {this.renderNumber()}
                        </View>
                    </View>
                </View>
            </View>
        </TouchableNativeFeedback>
    }

}
