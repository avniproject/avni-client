import React from 'react';
import {SafeAreaView, Text, ToastAndroid, View} from 'react-native';
import PropTypes from 'prop-types';
import {WebView} from 'react-native-webview';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from '../../framework/routing/Path';
import CHSContainer from '../common/CHSContainer';
import AppHeader from '../common/AppHeader';
import _ from 'lodash';
import CustomCardConfigService from '../../service/CustomCardConfigService';
import RuleEvaluationService from '../../service/RuleEvaluationService';
import General from '../../utility/General';
import ErrorUtil from '../../framework/errorHandling/ErrorUtil';
import CustomCardCommandService from '../../service/customDashboard/CustomCardCommandService';
import {buildCustomCardPageScript, PAGE_COMMAND_DEFINITIONS} from './CustomCardPageScript';

// Where a message came from. On the message listener bridge (current phones) the url is the sender's origin, and the
// card's page, loaded from html with no base URL, has an opaque origin that reads as the string "null". On the fallback
// bridge the url is the page's own: about:blank, with a fragment after a link such as href="#", or empty. Any other
// value, such as a bare https origin or a full https url, is another page, and its messages are not accepted. Adjust
// here if an emulator check shows otherwise.
export function isCardsOwnPage(url) {
    return url === undefined || url === null || url === '' || url === 'null' || /^about:blank(#.*)?$/.test(url);
}

@Path('/customCardDetailView')
class CustomCardDetailView extends AbstractComponent {
    static propTypes = {
        customCardConfig: PropTypes.object.isRequired,
        reportCard: PropTypes.object.isRequired,
        ruleInputArray: PropTypes.array,
        displayName: PropTypes.string,
        // The dashboard the card was pressed on, and how to open another one above this page. Both come from the
        // dashboard screen; without the callback a card page opens no dashboard.
        sourceDashboardUUID: PropTypes.string,
        onOpenDashboard: PropTypes.func,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {html: null, error: null};
        this._isMounted = false;
        this._commandNavigated = false;
        // A random value only this page's script holds and puts on every command. One per card page, not per load: a
        // refresh with the same html does not reload the page, which keeps the token its script was given.
        this._pageToken = General.randomUUID();
        this._pageScript = buildCustomCardPageScript(PAGE_COMMAND_DEFINITIONS, this._pageToken);
    }

    componentDidMount() {
        this._isMounted = true;
        return this.load();
    }

    // The card page is in front again. After a command opened a screen, the page is built again from its rule, as
    // what the user did there may have changed what the card shows.
    didFocus() {
        if (!this._commandNavigated) return;
        this._commandNavigated = false;
        // Two frames on, so the back slide finishes before the load blocks the JS thread (AbstractComponent, #2054).
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (this._isMounted) this.load();
        }));
    }

    async load() {
        const {customCardConfig, ruleInputArray} = this.props;
        try {
            const template = await this.getService(CustomCardConfigService).readHtmlTemplate(customCardConfig);
            const ruleResult = this.getService(RuleEvaluationService)
                .executeCustomCardDataRule(customCardConfig, ruleInputArray) || {};
            // On a failure the earlier page goes too, as its counts would read as current under the error.
            if (ruleResult.hasErrorMsg) {
                if (this._isMounted) this.setState({html: null, error: ruleResult.errorMsg || 'Data rule failed'});
                return;
            }
            // Rule may return either `data` (eager — plain object, array, or Realm result) or `deferredDataFunction` (invoked here, for heavy compute). `data` wins when both are present.
            const eagerData = ruleResult.data;
            const data = (eagerData != null && typeof eagerData === 'object')
                ? eagerData
                : (_.isFunction(ruleResult.deferredDataFunction) ? ruleResult.deferredDataFunction() : {});
            const translations = this.getService(CustomCardConfigService).resolveTranslations(customCardConfig);
            const html = new Function('data', 'translations', `return \`${template}\``)(data, translations);
            if (this._isMounted) this.setState({html, error: null});
        } catch (e) {
            General.logError('CustomCardDetailView', e);
            if (this._isMounted) this.setState({html: null, error: e.message || String(e)});
        }
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    // Whether this card page is the screen in front. The router has no route in front from the start of a slide to its end.
    isInFront() {
        return _.get(_.invoke(this.context, 'focusedRoute'), 'path') === CustomCardDetailView.path();
    }

    page() {
        return {
            view: this,
            reportCard: this.props.reportCard,
            showMessage: (key) => ToastAndroid.show(this.I18n.t(key), ToastAndroid.SHORT),
            navigate: (navigateFrom) => {
                if (this._commandNavigated) return false;
                // Only while this page is the screen in front: a push during the back slide lands on a stack being
                // popped and the app crashes, and a push during this page's own slide in would have its mark cleared by
                // that slide's didFocus.
                if (!this.isInFront()) {
                    General.logDebug('CustomCardDetailView', 'A command is dropped: the card page is not the screen in front');
                    return false;
                }
                navigateFrom(this);
                this._commandNavigated = true;
                return true;
            },
            sourceDashboardUUID: this.props.sourceDashboardUUID,
            // Opens the target above this page. beforeOpen runs first, only when the screen really opens, so a double
            // tap carries nothing, and a throw from it or from the open leaves the page taking commands.
            openDashboard: (target, beforeOpen = _.noop) => {
                if (!_.isFunction(this.props.onOpenDashboard)) {
                    General.logDebug('CustomCardDetailView', 'No open callback on this page, so no dashboard is opened');
                    return false;
                }
                return this.page().navigate(view => {
                    beforeOpen();
                    view.props.onOpenDashboard(view, target);
                });
            },
        };
    }

    onMessage = (event) => {
        const {url, data} = event.nativeEvent;
        if (!isCardsOwnPage(url)) return;
        let message;
        try {
            message = JSON.parse(data);
        } catch (e) {
            return;
        }
        if (!_.isPlainObject(message) || !_.isString(message.avniCommand)) return;
        // A frame inside the page reads as the page itself, and the page can post to the bridge without the touch check.
        // Neither has the token.
        if (message.token !== this._pageToken) {
            General.logDebug('CustomCardDetailView', "A message is dropped: it does not carry this page's token");
            return;
        }
        // A second tap while the first command's screen opens, or a tap during a slide, would run the command's lookups
        // for nothing before navigate refused.
        if (this._commandNavigated || !this.isInFront()) {
            General.logDebug('CustomCardDetailView', `A command is dropped: ${this._commandNavigated ? 'an earlier command has opened a screen' : 'the card page is not the screen in front'}`);
            return;
        }
        try {
            this.getService(CustomCardCommandService).dispatch(message, this.page());
        } catch (e) {
            General.logError('CustomCardDetailView', e);
            ErrorUtil.notifyBugsnag(e, 'CustomCardDetailView');
            // Otherwise the tap does nothing, and the user cannot tell it failed.
            this.page().showMessage('unknownError');
        }
    };

    render() {
        const title = this.props.displayName || this.props.reportCard.name;
        return (
            <CHSContainer>
                <AppHeader title={title}/>
                <SafeAreaView style={{flex: 1}}>
                    {this.state.error && <Text style={{padding: 16, color: 'red'}}>{this.state.error}</Text>}
                    {this.state.html && (
                        <View style={{flex: 1, paddingHorizontal: 12, paddingVertical: 12}}>
                            <WebView
                                source={{html: this.state.html}}
                                injectedJavaScriptBeforeContentLoaded={this._pageScript}
                                onMessage={this.onMessage}
                                style={{flex: 1}}
                                scalesPageToFit={false}
                                originWhitelist={['*']}
                                javaScriptEnabled={true}
                                allowFileAccess={false}
                                allowFileAccessFromFileURLs={false}
                                allowUniversalAccessFromFileURLs={false}
                            />
                        </View>
                    )}
                </SafeAreaView>
            </CHSContainer>
        );
    }
}

export default CustomCardDetailView;
