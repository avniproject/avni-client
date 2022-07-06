import React, {Fragment} from "react";
import UserInfoService from "../../service/UserInfoService";
import {WebView} from 'react-native-webview';
import {Text, View} from 'react-native';
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {Icon} from "native-base";

class FormElementLabelWithDocumentation extends AbstractComponent {
    static propTypes = {
        element: PropTypes.object.isRequired,
        moreTextForLabel: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.state = {webViewHeight: 0, expand: false}
    }

    get label() {
        const mandatoryText = this.props.element.mandatory ?
            <Text style={{color: Colors.ValidationError}}> * </Text> : <Text/>;
        return <Text style={[Styles.formLabel, this.props.element.styles]}>{this.I18n.t(this.props.element.name)}{mandatoryText}</Text>;
    }

    onWebViewMessage(event) {
        this.setState({webViewHeight: Number(event.nativeEvent.data)})
    }

    renderHtml(contentHtml) {
        const moreTextForLabel = _.isNil(this.props.moreTextForLabel) ? '' : this.props.moreTextForLabel;
        const htmlToRender = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta http-equiv="content-type" content="text/html; charset=utf-8">
            <meta name="viewport" content="width=320, user-scalable=no">
        </head>
        <body style="margin: 0 !important;padding: 0 !important; background-color: #ffffff">
            ${contentHtml}
        </body>
        </html>
        `;
        return (
            <Fragment>
                <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
                    <Text style={Styles.formLabel}>{this.label}{moreTextForLabel}</Text>
                    {!this.state.expand &&
                    <Icon
                        name='questioncircle'
                        type='AntDesign'
                        style={{
                            marginLeft: 5,
                            fontSize: 14,
                            lineHeight: 18,
                            color: Colors.DocumentationInfoColor
                        }}
                        onPress={() => this.setState(state => ({...state, expand: true}))}
                    />}
                </View>
                {this.state.expand &&
                <Fragment>
                    <WebView
                        onMessage={this.onWebViewMessage.bind(this)}
                        injectedJavaScript='window.ReactNativeWebView.postMessage(document.body.scrollHeight)'
                        style={{height: this.state.webViewHeight}}
                        originWhitelist={['*']}
                        source={{html: htmlToRender}}/>
                    <Icon
                        name={'md-caret-up-circle'}
                        type='Ionicons'
                        style={{fontSize: 20, color: Colors.DocumentationInfoColor, marginBottom: 5}}
                        onPress={() => this.setState(state => ({...state, expand: false}))}
                    />
                </Fragment>}
            </Fragment>

        )
    }

    getContentHtml(element) {
        const currentLocale = _.get(this.getService(UserInfoService).getUserSettings(), 'locale', 'en');
        const documentationItems = _.get(element.documentation, 'documentationItems', []);
        const localeDocumentation = _.find(documentationItems, ({language}) => language === currentLocale);
        const documentationHtml = _.get(localeDocumentation, 'contentHtml');
        const defaultDocumentation = _.find(documentationItems, ({language}) => language === 'en');
        return _.isNil(documentationHtml, 'contentHtml') ?
            _.get(defaultDocumentation, 'contentHtml') : documentationHtml;
    }

    render() {
        const {element} = this.props;
        if (_.isNil(element)) return null;
        if (_.isNil(element.documentation)) return this.label;
        const contentHtml = this.getContentHtml(element);
        return _.isEmpty(contentHtml) ? this.label : this.renderHtml(contentHtml)
    }
}

export default FormElementLabelWithDocumentation;
