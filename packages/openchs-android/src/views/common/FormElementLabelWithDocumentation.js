import React, {Fragment} from 'react';
import UserInfoService from '../../service/UserInfoService';
import {Dimensions, Text, TouchableNativeFeedback, View, Linking} from 'react-native';
import Styles from '../primitives/Styles';
import Colors from '../primitives/Colors';
import AbstractComponent from '../../framework/view/AbstractComponent';
import PropTypes from 'prop-types';
import AutoHeightWebView from 'react-native-autoheight-webview';
import AvniIcon from './AvniIcon';
import _ from 'lodash';
import MediaContent from './MediaContent';
import DocumentationHtmlRenderer from '../../utility/DocumentationHtmlRenderer';

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
        const configuredStyles = this.props.element.styles;
        const hasConfiguredStyles = !_.isEmpty(configuredStyles);
        return <Text
            style={[
                Styles.formLabel,
                // configuredStyles, // temporarily disabled: this pulls backgroundColour/textColour key-values set on
                // the form element in the Form Builder (e.g. the purple highlight on "Image-wise AI Assessment"), which
                // doesn't match the new design. Forcing the Figma brand color instead, but only where a custom style
                // was actually configured (plain labels with no configured style keep the default look untouched).
                // Re-enable configuredStyles above (and drop the line below) to restore per-element custom label colors.
                hasConfiguredStyles && {color: Colors.BrandPrimaryDark}
            ]}>{this.I18n.t(this.props.element.name)}{mandatoryText}{moreTextForLabel}</Text>;
    }

    labelDisplay() {
        const media = this.props.element.concept.media || [];
        const hasImageMedia = media.some(m => m.isImage());
        // "Suspicious Images Display" is a full-width warning strip in the new design (grey
        // background spanning the row + amber text), not a plain inline label - the normal
        // flex:8 inline-Text layout below can't stretch a nested Text's background to full width,
        // so it's rendered as its own block here instead of going through this.label.
        if (this.props.element.name === 'Suspicious Images Display') {
            return (
                <View style={{backgroundColor: Colors.SectionHeaderBackground, paddingVertical: 10, paddingHorizontal: 8}}>
                    <Text style={[Styles.formLabel, {color: Colors.WarningTextDark, fontWeight: '500'}]}>
                        {this.I18n.t(this.props.element.name)}
                    </Text>
                </View>
            );
        }
        return (
            <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[Styles.formLabel, {
                        flex: 8,
                        lineHeight: Styles.normalTextSize + 16
                    }]}>{this.label}</Text>
                    {media.length > 0 && !hasImageMedia && <MediaContent media={media} style={{marginBottom: 5}} size={36}/>}
                </View>
                {hasImageMedia &&
                <View style={{
                    marginTop: 8,
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: Colors.InputBorderNormal
                }}>
                    <MediaContent media={media} fullWidth={true}/>
                </View>}
            </View>
        );
    }

    renderHtml(contentHtml) {
        //There are some hacks done to render the HTML properly.
        //1. ContainerWidth changes to half for the questionGroup children if they are displayed in tabular way.
        //2. There's margin-top and margin-bottom added to the body tag, this is done to make sure user don't have to
        //   scroll to view the content. Somehow that extra margin gets added which will be removed from this.
        
        const {width} = Dimensions.get('window');
        const containerWidth = this.props.isTableView ? (width - 16) / 2.2 : width - 16;
        
        // Use DocumentationHtmlRenderer to create the HTML content
        const htmlToRender = DocumentationHtmlRenderer.createDocumentationHtml({
            contentHtml,
            // Use the theme colors from the app
            linkColor: Colors.LinkColor || '#007AFF',
            visitedLinkColor: Colors.LinkVisitedColor || '#5856D6',
            bodyMarginFix: true
        });
        
        return (
            <Fragment>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                }}>
                    <View style={{flex: 8}}>{this.labelDisplay()}</View>
                    <View style={{flex: 2, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start'}}>
                        <TouchableNativeFeedback
                            background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                            onPress={() => this.setState(state => ({...state, expand: true}))}>
                            <View>
                                {!this.state.expand &&
                                    <AvniIcon
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
                                <View>
                                    <AvniIcon
                                        name="closecircle"
                                        type="AntDesign"
                                        style={{
                                            marginLeft: 5,
                                            fontSize: Styles.normalTextSize,
                                            padding: 20,
                                            color: Colors.Complimentary,
                                        }}
                                    />
                                </View>
                            </TouchableNativeFeedback>
                        </View>
                        <AutoHeightWebView
                            style={{
                                width: containerWidth,
                                marginBottom: 16,
                                paddingBottom: 8
                            }}
                            source={{html: htmlToRender}}
                            scalesPageToFit={false}
                            viewportContent={'width=device-width, initial-scale=1, maximum-scale=1'}
                            onMessage={(event) => {
                                try {
                                    const url = event.nativeEvent.data;
                                    if (url && url.startsWith('http')) {
                                        Linking.openURL(url);
                                    }
                                } catch (error) {
                                    // Error silently handled
                                }
                            }}
                            onError={(error) => {
                            }}
                            onLoad={() => {
                            }}
                        />
                    </View>
                }
            </Fragment>
        );
    }

    shouldComponentUpdate(nextProps, nextState) {
        return this.props.element.documentation !== nextProps.element.documentation;
    }

    getContentHtml(element) {
        const currentLocale = _.get(this.getService(UserInfoService).getUserSettings(), 'locale', 'en');
        const documentationItems = _.get(element.documentation, 'documentationItems', []);
        const localeDocumentation = _.find(documentationItems, ({language}) => language === currentLocale);
        const documentationHtml = _.get(localeDocumentation, 'contentHtml');
        const defaultDocumentation = _.find(documentationItems, ({language}) => language === 'en');
        return _.isNil(documentationHtml) ?
            _.get(defaultDocumentation, 'contentHtml') : documentationHtml;
    }

    render() {
        const {element} = this.props;
        if (_.isNil(element)) return null;
        if (_.isNil(element.documentation)) return this.labelDisplay();
        const contentHtml = this.getContentHtml(element);
        return _.isEmpty(contentHtml) ? this.labelDisplay() : this.renderHtml(contentHtml);
    }
}

export default FormElementLabelWithDocumentation;
