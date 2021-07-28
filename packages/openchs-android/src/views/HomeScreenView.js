import React from "react";
import Path from "../framework/routing/Path";
import AbstractComponent from "../framework/view/AbstractComponent";
import WebView from "react-native-webview";
import _ from 'lodash';

@Path('/HomeScreenView')
export default class LandingView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return "HomeScreenView";
    }

    render() {
        return _.isEmpty(this.props.html) ?
            (<WebView source={{uri: 'file:///android_asset/homePage.html'}}/>)
            : (<WebView
                    originWhitelist={['*']}
                    source={{html: this.props.html}}
                />
            );
    }
}
