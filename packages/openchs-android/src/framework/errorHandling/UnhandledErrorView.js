import React, {Component} from 'react';
import {Image, View} from "react-native";
import PropTypes from "prop-types";
import {ErrorDisplay} from "./ErrorDisplay";
import {JSONStringify} from "../../utility/JsonStringify";

export default class UnhandledErrorView extends Component {
    static propTypes = {
        avniError: PropTypes.object.isRequired
    };

    render() {
        console.log("UnhandledErrorView", JSONStringify(this.props.avniError));
        return <View style={{flex: 1}}>
            <Image source={{uri: `asset:/logo.png`}}
                   style={{height: 120, width: 120, alignSelf: 'center'}} resizeMode={'center'}/>
            <ErrorDisplay avniError={this.props.avniError}/>
        </View>
    }
}
