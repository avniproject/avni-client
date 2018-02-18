import PropTypes from 'prop-types';
import React, {Component, Text, View} from "react";
import {Alert, StyleSheet} from "react-native";
import _ from "lodash";
import MessageService from "../../service/MessageService";
import General from "../../utility/General";
import DGS from '../../views/primitives/DynamicGlobalStyles';
import TypedTransition from "../routing/TypedTransition";

class AbstractComponent extends Component {
    static contextTypes = {
        navigator: PropTypes.func.isRequired,
        getService: PropTypes.func.isRequired,
        getStore: PropTypes.func
    };

    constructor(props, context, topLevelStateVariable) {
        super(props, context);
        this.topLevelStateVariable = topLevelStateVariable;
        this.I18n = context.getService(MessageService).getI18n();
        this.scrollToTop = this.scrollToTop.bind(this);
    }

    static styles = StyleSheet.create({
        spinner: {
            justifyContent: 'center',
            alignSelf: 'center',
        },
        listRowSeparator: {
            height: 2,
            backgroundColor: '#14e4d5'
        },
    });

    dispatchAction(action, params) {
        if (General.canLog(General.LogLevel.Debug))
            General.logDebug('AbstractComponent', `Dispatching action: ${JSON.stringify(action)}`);
        this.context.getStore().dispatch({"type": action, ...params});
    }

    getContextState(param) {
        return this.context.getStore().getState()[param];
    }

    showError(message) {
        Alert.alert(this.I18n.t("validationError"), message,
            [
                {
                    text: this.I18n.t('ok'), onPress: () => {
                }
                },
            ]
        );
    }

    componentWillMount() {
        if (_.isNil(this.topLevelStateVariable)) return;
        this.unsubscribe = this.context.getStore().subscribe(this.refreshState.bind(this));
        this.refreshState();
    }

    refreshState() {
        const nextState = this.getContextState(this.topLevelStateVariable);
        if (!General.areEqualShallow(nextState, this.state)) {
            if (!_.isNil(nextState.error))
                this.showError(nextState.error.message);
            this.setState(nextState);
        }
    }

    scrollToTop() {
        // Mihir: Trust me this is required. 
        this.refs.scroll._scrollview.scrollToPosition(0, 10, true);
        this.refs.scroll._scrollview.scrollToPosition(0, 1, true);
    }

    componentWillUnmount() {
        if (_.isNil(this.topLevelStateVariable)) return;
        this.unsubscribe();
    }

    appendedStyle(style) {
        const appendedStyle = _.assign({}, _.isNil(style) ? {} : style, this.props.style);
        return this.scaleStyle(appendedStyle);
    }

    scaleStyle(styles) {
        const resizeStylesFn = (filterList, resizeFn) => (value, key) => {
                return _.find(filterList, (name) => name === key) ? resizeFn.call(DGS, value) : value
            },
            resizeHorizontalStylesFn = resizeStylesFn(DGS.stylesForHorizontalDistances, DGS.resizeWidth),
            resizeVerticalStylesFn = resizeStylesFn(DGS.stylesForVerticalDistances, DGS.resizeHeight);

        return _.chain(styles)
            .mapValues(resizeHorizontalStylesFn)
            .mapValues(resizeVerticalStylesFn)
            .value();
    }

    goBack() {
        TypedTransition.from(this).goBack();
    }
}

export default AbstractComponent;