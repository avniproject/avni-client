import React, {Fragment} from 'react';
import UserInfoService from '../../service/UserInfoService';
import {Text, TouchableNativeFeedback, View} from 'react-native';
import Styles from '../primitives/Styles';
import Colors from '../primitives/Colors';
import AbstractComponent from '../../framework/view/AbstractComponent';
import PropTypes from 'prop-types';
import {Icon} from 'native-base';
import AutoHeightWebView from 'react-native-autoheight-webview';
import {Dimensions} from 'react-native';
import Separator from '../primitives/Separator';

class FormElementLabelWithDocumentation extends AbstractComponent {
    static propTypes = {
        element: PropTypes.object.isRequired,
        moreTextForLabel: PropTypes.object,
        isTableView: PropTypes.bool
    };

    constructor(props, context) {
        super(props, context);
        this.state = {expand: false};
    }

    get label() {
        const moreTextForLabel = _.isNil(this.props.moreTextForLabel) ? '' : this.props.moreTextForLabel;
        const mandatoryText = this.props.element.mandatory ?
            <Text style={{color: Colors.ValidationError}}> * </Text> : <Text/>;
        return <Text
            style={[Styles.formLabel, this.props.element.styles]}>{this.I18n.t(this.props.element.name)}{mandatoryText}{moreTextForLabel}</Text>;
    }

    renderHtml(contentHtml) {
        //There are some hacks done to render the HTML properly.
        //1. ContainerWidth changes to half for the questionGroup children if they are displayed in tabular way.
        //2. There's margin-top and margin-bottom added to the body tag, this is done to make sure user don't have to
        //   scroll to view the content. Somehow that extra margin gets added which will be removed from this.
        const {width} = Dimensions.get('window');
        const containerWidth = this.props.isTableView ? (width - 16) / 2.2 : width - 16;
        const moreTextForLabel = _.isNil(this.props.moreTextForLabel) ? '' : this.props.moreTextForLabel;
        const htmlToRender = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta http-equiv="content-type" content="text/html; charset=utf-8">
            <meta name="viewport" content="width=device-width, user-scalable=no">
        </head>
        <body style="margin-top: -18px !important; margin-bottom: -18px !important;">
            ${contentHtml}
        </body>
        </html>
        `;
        return (
            <Fragment>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                }}>
                    <Text style={[Styles.formLabel, {
                        flex: 8,
                        lineHeight: Styles.normalTextSize + 16
                    }]}>{this.label}{moreTextForLabel}</Text>
                    <View style={{flex: 2, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start'}}>
                        <TouchableNativeFeedback
                            background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                            onPress={() => this.setState(state => ({...state, expand: true}))}>
                            <View>
                                {!this.state.expand &&
                                    <Icon
                                        name="questioncircle"
                                        type="AntDesign"
                                        style={{
                                            marginLeft: 5,
                                            fontSize: Styles.normalTextSize,
                                            padding: 20,
                                            color: Colors.Complimentary,
                                        }}
                                    />}
                            </View>
                        </TouchableNativeFeedback>
                    </View>
                </View>
                {
                    this.state.expand &&
                    <View style={{backgroundColor: Colors.GreyContentBackground}}>
                        <View style={{
                            backgroundColor: Colors.GreyContentBackground,
                            flexDirection: 'row',
                            justifyContent: 'flex-end'
                        }}>
                            <TouchableNativeFeedback
                                background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                                onPress={() => this.setState(state => ({...state, expand: false}))}>
                            <Icon
                                name="closecircle"
                                type="AntDesign"
                                style={{
                                    marginLeft: 5,
                                    fontSize: Styles.normalTextSize,
                                    padding: 20,
                                    color: Colors.Complimentary,
                                }}
                            />
                            </TouchableNativeFeedback>
                        </View>
                        <AutoHeightWebView
                            style={{
                                width: containerWidth,
                                marginBottom: 16,
                                paddingBottom: 8
                            }}
                            source={{html: htmlToRender}}
                        />
                    </View>
                }
            </Fragment>

        )
            ;
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
