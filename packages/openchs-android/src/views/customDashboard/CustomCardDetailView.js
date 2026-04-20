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
    }

    async componentDidMount() {
        const {customCardConfig, ruleInputArray} = this.props;
        try {
            const template = await this.getService(CustomCardConfigService).readHtmlTemplate(customCardConfig);
            const ruleResult = this.getService(RuleEvaluationService)
                .executeCustomCardDataRule(customCardConfig, ruleInputArray) || {};
            const data = _.isFunction(ruleResult.lineListFunction)
                ? ruleResult.lineListFunction()
                : {};
            const body = new Function('data', 'translations', `return \`${template}\``)(data, {});
            this.setState({html: body});
        } catch (e) {
            General.logError('CustomCardDetailView', e);
            this.setState({error: e.message || String(e)});
        }
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
                            />
                        </View>
                    )}
                </SafeAreaView>
            </CHSContainer>
        );
    }
}

export default CustomCardDetailView;
