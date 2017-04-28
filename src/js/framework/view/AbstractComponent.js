import React, {Component, Text, View} from "react";
import {Alert, StyleSheet} from "react-native";
import _ from "lodash";
import MessageService from "../../service/MessageService";
import General from "../../utility/General";
import DGS from '../../views/primitives/DynamicGlobalStyles';

class AbstractComponent extends Component {
    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func
    };

    constructor(props, context, topLevelStateVariable) {
        super(props, context);
        this.topLevelStateVariable = topLevelStateVariable;
        this.I18n = context.getService(MessageService).getI18n();
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
            General.logDebug(this.constructor.name, `Dispatching action: ${JSON.stringify(action)}`);
        this.context.getStore().dispatch({"type": action, ...params});
    }

    getContextState(param) {
        return this.context.getStore().getState()[param];
    }

    showError(errorMessage) {
        Alert.alert(this.I18n.t("validationError"), errorMessage,
            [
                {
                    text: this.I18n.t('ok'), onPress: () => {
                }
                }
            ]
        );
    }

    static _renderSeparator(rowNumber, rowID, total) {
        if (rowNumber === (total - 1) || rowNumber === `${(total - 1)}` || total === 0 || total === undefined) {
            return (<View key={rowID}/>);
        }
        return (<Text key={rowID} style={AbstractComponent.styles.listRowSeparator}/>);
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

    componentWillUnmount() {
        if (_.isNil(this.topLevelStateVariable)) return;
        this.unsubscribe();
    }

    appendedStyle(style) {
        const appendedStyle = _.assign({}, _.isNil(style) ? {} : style, this.props.style);
        return this.scaleStyle(appendedStyle);
    }

    scaleStyle(style) {
        DGS.stylesForHorizontalDistances.forEach((styleItem) => {
            if (!_.isNil(style[styleItem]))
                style[styleItem] = DGS.resizeWidth(style[styleItem])
        });
        DGS.stylesForVerticalDistances.forEach((styleItem) => {
            if (!_.isNil(style[styleItem]))
                style[styleItem] = DGS.resizeHeight(style[styleItem])
        });
        return style;
    }
}

export default AbstractComponent;
