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
import {CUSTOM_CARD_PAGE_SCRIPT} from './CustomCardPageScript';

// Where a message came from. On the message listener bridge (current phones) the url is the sender's origin, and the
// card's page, loaded from html with no base URL, has an opaque origin that reads as the string "null". On the fallback
// bridge the url is the page's own: about:blank, or empty. Any other value, such as a bare https origin or a full https
// url, is another page, and its messages are not accepted. Adjust here if an emulator check shows otherwise.
export function isCardsOwnPage(url) {
    return url === undefined || url === null || url === '' || url === 'null' || url === 'about:blank';
}

@Path('/customCardDetailView')
class CustomCardDetailView extends AbstractComponent {
    static propTypes = {
        customCardConfig: PropTypes.object.isRequired,
        reportCard: PropTypes.object.isRequired,
        ruleInputArray: PropTypes.array,
        displayName: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {html: null, error: null};
        this._isMounted = false;
        this._commandNavigated = false;
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
            if (ruleResult.hasErrorMsg) {
                if (this._isMounted) this.setState({error: ruleResult.errorMsg || 'Data rule failed'});
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
            if (this._isMounted) this.setState({error: e.message || String(e)});
        }
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    page() {
        return {
            view: this,
            reportCard: this.props.reportCard,
            showMessage: (key) => ToastAndroid.show(this.I18n.t(key), ToastAndroid.SHORT),
            navigate: (navigateFrom) => {
                if (this._commandNavigated) return false;
                navigateFrom(this);
                this._commandNavigated = true;
                return true;
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
        try {
            this.getService(CustomCardCommandService).dispatch(message, this.page());
        } catch (e) {
            General.logError('CustomCardDetailView', e);
            ErrorUtil.notifyBugsnag(e, 'CustomCardDetailView');
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
                                injectedJavaScriptBeforeContentLoaded={CUSTOM_CARD_PAGE_SCRIPT}
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
