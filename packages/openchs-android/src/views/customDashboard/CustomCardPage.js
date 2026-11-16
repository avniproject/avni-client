import React from 'react';
import {AccessibilityInfo, Text, ToastAndroid, TouchableOpacity, View} from 'react-native';
import PropTypes from 'prop-types';
import {WebView} from 'react-native-webview';
import _ from 'lodash';
import {RuleFailureTelemetry, SyncTelemetry, UserInfo} from 'openchs-models';
import AbstractComponent from '../../framework/view/AbstractComponent';
import General from '../../utility/General';
import ErrorUtil from '../../framework/errorHandling/ErrorUtil';
import CustomCardCommandService from '../../service/customDashboard/CustomCardCommandService';
import EntityQueueService from '../../service/EntityQueueService';
import Colors from '../primitives/Colors';
import {buildCustomCardPageScript, PAGE_COMMAND_DEFINITIONS} from './CustomCardPageScript';

// Where a message came from. On the message listener bridge (current phones) the url is the sender's origin, and the
// card's page, loaded from html with no base URL, has an opaque origin that reads as the string "null". On the fallback
// bridge the url is the page's own: about:blank, with a fragment after a link such as href="#", or empty. Any other
// value, such as a bare https origin or a full https url, is another page, and its messages are not accepted. Adjust
// here if an emulator check shows otherwise.
export function isCardsOwnPage(url) {
    return url === undefined || url === null || url === '' || url === 'null' || /^about:blank(#.*)?$/.test(url);
}

// The page with the script before anything of its own: after a leading doctype, which must stay first, else at the
// start, where the browser moves it into the head. An injected script can run after the page's own on Android, and a
// page that checks for avni as it loads would then draw as on an older app.
const LEADING_DOCTYPE = /^\uFEFF?(?:\s|<!--[\s\S]*?-->)*<!doctype[^>]*>/i;

export function withPageScript(html, script) {
    const tag = `<script>${script}</script>`;
    const doctype = LEADING_DOCTYPE.exec(html);
    const end = doctype ? doctype[0].length : 0;
    return html.slice(0, end) + tag + html.slice(end);
}

// Rows a read can write too: a failing rule, the sync's own record, and the user's settings.
const NOT_SAVES = [RuleFailureTelemetry.schema.name, SyncTelemetry.schema.name, UserInfo.schema.name];
export const SAVED_SINCE_QUERY = `savedAt > $0 AND ${NOT_SAVES.map((entity) => `entity <> '${entity}'`).join(' AND ')}`;

// Every save adds a queue row with its time, a second save of a queued record included, so a row newer than the time
// means something was saved. The queue count would not do: it counts each record once.
// shortcut: a sync that uploads the rows before the user comes back removes them, so that save is missed; accepted,
// revisit if users report a page that did not update after a save.
export function savedSince(context, time) {
    if (_.isNil(time)) return false;
    return context.getService(EntityQueueService).findAll().filtered(SAVED_SINCE_QUERY, time).length > 0;
}

// What a command gets to act through: the host screen, the card, and how to open a screen above the host.
export function cardPageHandle(view, {reportCard, sourceDashboardUUID, onOpenDashboard, isInFront, logTag}) {
    const handle = {
        view,
        reportCard,
        showMessage: (key) => ToastAndroid.show(view.I18n.t(key), ToastAndroid.SHORT),
        navigate: (navigateFrom) => {
            if (view._commandNavigated) return false;
            // Only while the page is the screen in front: a push during the back slide lands on a stack being popped
            // and the app crashes, and a push during the page's own slide in would have its mark cleared by that
            // slide's focus.
            if (!isInFront()) {
                General.logDebug(logTag, 'A command is dropped: the card page is not the screen in front');
                return false;
            }
            navigateFrom(view);
            view._commandNavigated = true;
            view._commandOpenedAt = new Date();
            return true;
        },
        sourceDashboardUUID,
        // Opens the target above the page. beforeOpen runs first, only when the screen really opens, so a double tap
        // carries nothing, and a throw from it or from the open leaves the page taking commands.
        openDashboard: (target, beforeOpen = _.noop) => {
            if (!_.isFunction(onOpenDashboard)) {
                General.logDebug(logTag, 'No open callback on this page, so no dashboard is opened');
                return false;
            }
            return handle.navigate((from) => {
                beforeOpen();
                onOpenDashboard(from, target);
            });
        },
    };
    return handle;
}

class CustomCardPage extends AbstractComponent {
    static propTypes = {
        html: PropTypes.string,
        error: PropTypes.string,
        updating: PropTypes.bool,
        held: PropTypes.bool,
        onLoadPage: PropTypes.func,
        padded: PropTypes.bool,
        bottomInset: PropTypes.number,
        // The dashboard the page belongs to. Another dashboard gets a new WebView, which opens at the top.
        pageKey: PropTypes.string,
        dropReason: PropTypes.func.isRequired,
        page: PropTypes.func.isRequired,
        logTag: PropTypes.string.isRequired,
    };

    static defaultProps = {
        padded: true,
        bottomInset: 0,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {webViewKey: 0, remountedFor: null, crashedOn: null, screenReader: false};
        // A random value only this page's script holds and puts on every command. One per host, not per page: a new
        // page with the same html does not reload, which keeps the token its script was given.
        this._pageToken = General.randomUUID();
    }

    onViewDidMount() {
        const setScreenReader = (on) => {
            if (!this._isUnmounted) this.setState({screenReader: !!on});
        };
        AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader, _.noop);
        this._screenReaderSubscription = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    }

    componentWillUnmount() {
        _.invoke(this._screenReaderSubscription, 'remove');
        super.componentWillUnmount();
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
        if (!_.isPlainObject(message)) return;
        const {logTag} = this.props;
        // The page's script dropped a command that did not come from the user; this is where an implementer sees why.
        if (_.isString(message.avniDropped) && message.token === this._pageToken) {
            General.logWarn(logTag, `The page's ${_.truncate(message.avniDropped, {length: 40})} was dropped: ${_.truncate(String(message.reason), {length: 80})}`);
            return;
        }
        if (!_.isString(message.avniCommand)) return;
        // A frame inside the page reads as the page itself, and the page can post to the bridge without the touch check.
        // Neither has the token.
        if (message.token !== this._pageToken) {
            General.logDebug(logTag, "A message is dropped: it does not carry this page's token");
            return;
        }
        // A second tap while the first command's screen opens, or a tap during a slide, would run the command's lookups
        // for nothing before navigate refused.
        const reason = this.props.dropReason();
        if (reason) {
            General.logDebug(logTag, `A command is dropped: ${reason}`);
            return;
        }
        const page = this.props.page(message.avniCommand);
        try {
            this.getService(CustomCardCommandService).dispatch(message, page);
        } catch (e) {
            General.logError(logTag, e);
            ErrorUtil.notifyBugsnag(e, logTag);
            // Otherwise the tap does nothing, and the user cannot tell it failed.
            page.showMessage('unknownError');
        }
    };

    // Android 8 and above. A second crash on the same page would loop, so it shows an error instead.
    onRenderProcessGone = (event) => {
        const didCrash = _.get(event, 'nativeEvent.didCrash');
        const {html, logTag} = this.props;
        General.logError(logTag, `The page's renderer is gone, didCrash: ${didCrash}`);
        if (didCrash && this.state.remountedFor === html) {
            this.setState({crashedOn: html});
            return;
        }
        this.setState((state) => ({webViewKey: state.webViewKey + 1, remountedFor: didCrash ? html : state.remountedFor}));
    };

    renderPage() {
        const {html, updating, padded} = this.props;
        return (
            <View style={{flex: 1}}>
            <View style={padded ? {flex: 1, paddingHorizontal: 12, paddingVertical: 12} : {flex: 1}}>
                <WebView
                    key={`${this.props.pageKey || ''}:${this.state.webViewKey}`}
                    source={{html: withPageScript(html, buildCustomCardPageScript(PAGE_COMMAND_DEFINITIONS, this._pageToken, this.state.screenReader))}}
                    onMessage={this.onMessage}
                    onRenderProcessGone={this.onRenderProcessGone}
                    style={{flex: 1}}
                    scalesPageToFit={false}
                    originWhitelist={['*']}
                    javaScriptEnabled={true}
                    allowFileAccess={false}
                    allowFileAccessFromFileURLs={false}
                    allowUniversalAccessFromFileURLs={false}
                />
            </View>
                {updating && (
                    // A thin bar over the page's top edge: a strip in the column would move the page on every update.
                    <View pointerEvents="none" accessibilityLiveRegion="polite" accessible={true}
                          accessibilityLabel={this.I18n.t('customCardPageUpdating')}
                          style={{position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: Colors.ActionButtonColor}}/>
                )}
            </View>
        );
    }

    renderContent() {
        const {html, error, updating, held, onLoadPage} = this.props;
        if (held) {
            return (
                <View style={{padding: 16}}>
                    <Text>{this.I18n.t('customCardPageHeld')}</Text>
                    <TouchableOpacity onPress={onLoadPage}
                                      style={{marginTop: 12, alignSelf: 'flex-start', padding: 10, borderRadius: 3, backgroundColor: Colors.ActionButtonColor}}>
                        <Text style={{color: Colors.TextOnPrimaryColor}}>{this.I18n.t('customCardPageLoad')}</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        if (error) return <Text style={{padding: 16, color: 'red'}}>{error}</Text>;
        if (!_.isNil(html) && this.state.crashedOn === html) return <Text style={{padding: 16, color: 'red'}}>{this.I18n.t('unknownError')}</Text>;
        if (!_.isNil(html)) return this.renderPage();
        if (updating) return <Text style={{padding: 16}}>{this.I18n.t('customCardPageLoading')}</Text>;
        return null;
    }

    render() {
        return <View style={{flex: 1, paddingBottom: this.props.bottomInset}}>{this.renderContent()}</View>;
    }
}

export default CustomCardPage;
