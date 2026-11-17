import React from 'react';
import {SafeAreaView} from 'react-native';
import PropTypes from 'prop-types';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from '../../framework/routing/Path';
import CHSContainer from '../common/CHSContainer';
import AppHeader from '../common/AppHeader';
import _ from 'lodash';
import CustomCardConfigService from '../../service/CustomCardConfigService';
import General from '../../utility/General';
import CustomCardPage, {cardPageHandle, savedSince} from './CustomCardPage';

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
    }

    get _pageToken() {
        return _.get(this.pageView, '_pageToken');
    }

    componentDidMount() {
        this._isMounted = true;
        return this.load();
    }

    // The card page is in front again. After a command opened a screen where something was saved, the page is built
    // again from its rule, as the save may have changed what the card shows.
    didFocus() {
        if (!this._commandNavigated) return;
        this._commandNavigated = false;
        const openedAt = this._commandOpenedAt;
        this._commandOpenedAt = null;
        if (!savedSince(this.context, openedAt)) return;
        // Two frames on, so the back slide finishes before the load blocks the JS thread (AbstractComponent, #2054).
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (this._isMounted) this.load();
        }));
    }

    async load() {
        const {customCardConfig, ruleInputArray} = this.props;
        const service = this.getService(CustomCardConfigService);
        try {
            const template = await service.loadTemplate(customCardConfig);
            // On a failure the earlier page goes too, as its counts would read as current under the error.
            const {html, error} = service.renderPage(customCardConfig, ruleInputArray, template);
            if (this._isMounted) this.setState({html: _.defaultTo(html, null), error: _.defaultTo(error, null)});
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
        return cardPageHandle(this, {
            reportCard: this.props.reportCard,
            sourceDashboardUUID: this.props.sourceDashboardUUID,
            onOpenDashboard: this.props.onOpenDashboard,
            isInFront: () => this.isInFront(),
            logTag: 'CustomCardDetailView',
        });
    }

    dropReason() {
        if (this._commandNavigated) return 'an earlier command has opened a screen';
        return this.isInFront() ? null : 'the card page is not the screen in front';
    }

    onMessage = (event) => this.pageView.onMessage(event);

    render() {
        const title = this.props.displayName || this.props.reportCard.name;
        return (
            <CHSContainer>
                <AppHeader title={title}/>
                <SafeAreaView style={{flex: 1}}>
                    <CustomCardPage ref={(view) => this.pageView = view}
                                    html={this.state.html}
                                    error={this.state.error}
                                    logTag="CustomCardDetailView"
                                    dropReason={() => this.dropReason()}
                                    page={() => this.page()}/>
                </SafeAreaView>
            </CHSContainer>
        );
    }
}

export default CustomCardDetailView;
