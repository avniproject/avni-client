import React from 'react';
import {SafeAreaView, Text, View} from 'react-native';
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
    }

    async componentDidMount() {
        this._isMounted = true;
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
            if (this._isMounted) this.setState({html});
        } catch (e) {
            General.logError('CustomCardDetailView', e);
            if (this._isMounted) this.setState({error: e.message || String(e)});
        }
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

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
