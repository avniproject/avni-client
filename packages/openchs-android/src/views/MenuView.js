import {Alert, Animated, Text, View, Dimensions} from "react-native";
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from 'lodash';
import Path from "../framework/routing/Path";
import {Button} from "native-base";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TypedTransition from "../framework/routing/TypedTransition";
import SettingsView from "./settings/SettingsView";
import SyncService from "../service/SyncService";
import {EntityMetaData} from "openchs-models";
import EntityService from "../service/EntityService";
import EntitySyncStatusService from "../service/EntitySyncStatusService";
import DynamicGlobalStyles from "../views/primitives/DynamicGlobalStyles";
import MyDashboardView from "./mydashbaord/MyDashboardView";
import Colors from "./primitives/Colors";
import CHSNavigator from "../utility/CHSNavigator";
import RuleEvaluationService from "../service/RuleEvaluationService";
import General from "../utility/General";
import ProgramConfigService from "../service/ProgramConfigService";
import CHSContent from "./common/CHSContent";
import Styles from "./primitives/Styles";
import * as Animatable from 'react-native-animatable';
import MessageService from "../service/MessageService";
import AuthenticationError from "../service/AuthenticationError";
import AuthService from "../service/AuthService";

@Path('/menuView')
class MenuView extends AbstractComponent {
    static propType = {
        startSync: React.PropTypes.bool
    };

    static defaultProps = {
        startSync: false
    };

    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false, error: false};
        this.createStyles();
    }

    viewName() {
        return "MenuView";
    }

    static iconStyle = {color: Colors.ActionButtonColor, opacity: 0.8, alignSelf: 'center', fontSize: 48};

    createStyles() {
        this.columnStyle = {
            marginHorizontal: DynamicGlobalStyles.resizeWidth(29),
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: DynamicGlobalStyles.resizeWidth(71),
            flexDirection: 'column'
        };
    }

    settingsView() {
        TypedTransition.from(this).to(SettingsView);
    }

    registrationView() {
        CHSNavigator.navigateToIndividualRegisterView(this);
    }

    changePasswordView() {
        CHSNavigator.navigateToChangePasswordView(this);
    }

    _preSync() {
        this.setState({syncing: true, error: false});
    }

    _postSync() {
        this.context.getService(RuleEvaluationService).init();
        this.context.getService(ProgramConfigService).init();
        this.context.getService(MessageService).init();
        this.dispatchAction('RESET');
        this.setState({syncing: false, error: false});
        General.logInfo(this.viewName(), 'Sync completed dispatching reset');
    }

    _onError(error) {
        General.logError(`${this.viewName()}-Sync`, error);
        this.setState({syncing: false});
        if (error instanceof AuthenticationError) {
            General.logWarn(this.viewName(), "Could not authenticate. Redirecting to login view");
            General.logWarn(this.viewName(), error);
            CHSNavigator.navigateToLoginView(this, (source) => CHSNavigator.navigateToLandingView(source, true, {
                tabIndex: 1,
                menuProps: {startSync: true}
            }));
        } else {
            Alert.alert("Sync Failed", error.message, [{
                    text: 'Try Again',
                    onPress: () => this.sync()
                },
                    {text: 'Cancel', onPress: _.noop, style: 'cancel'},
                ]
            );
        }
    }

    componentWillMount() {
        if (this.props.startSync) {
            this.sync();
        }
    }

    sync() {
        try {
            const syncService = this.context.getService(SyncService);
            const onError = this._onError.bind(this);
            const postSync = this._postSync.bind(this);
            this._preSync();
            syncService.sync(EntityMetaData.model()).then(postSync, onError);
        } catch (e) {
            this._onError(e);
        }
    }

    renderSyncButton() {
        return this.state.syncing ?
            (<Animatable.View iterationCount="infinite" duration={2000} animation="rotate">
                <Icon name="sync" style={MenuView.iconStyle}/>
            </Animatable.View>) : (<Icon name="sync" style={MenuView.iconStyle}/>);

    }

    myDashboard() {
        TypedTransition.from(this).to(MyDashboardView);
    }

    runRules() {
        this.context.getService(RuleEvaluationService).runOnAll();
    }


    onDelete() {
        const service = this.context.getService(EntityService);
        const entitySyncStatusService = this.context.getService(EntitySyncStatusService);
        const authService = this.context.getService(AuthService);
        Alert.alert(
            this.I18n.t('deleteSchemaNoticeTitle'),
            this.I18n.t('deleteSchemaConfirmationMessage'),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => {
                        authService.logout().then(() => {
                            service.clearDataIn(EntityMetaData.entitiesLoadedFromServer());
                            entitySyncStatusService.setup(EntityMetaData.model());
                        });
                    }
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
                    },
                    style: 'cancel'
                }
            ]
        )
    };

    renderMenuItem = (maxLength) => (iconName, menuMessageKey, pressHandler, idx) => {
        let pad = _.pad(menuMessageKey, 2 * Math.round(maxLength / 2), ' ');
        return (<View key={idx} style={this.columnStyle}>
            <Button style={{alignSelf: 'center'}} onPress={pressHandler} transparent large>
                <Icon name={iconName} style={MenuView.iconStyle}/>
            </Button>
            <Text style={Styles.menuTitle}>{pad}</Text>
        </View>);
    };


    render() {
        let menuItemsData = [
            ["settings", "Settings", this.settingsView.bind(this)],
            ["delete", "Delete Data", this.onDelete.bind(this), () => __DEV__],
            ["account-plus", "Register", this.registrationView.bind(this)],
            ["account-key", "Change Password", this.changePasswordView.bind(this)],
            ["view-list", "My Dashboard", this.myDashboard.bind(this)],
            ["face", "Run Rules", this.runRules.bind(this), ()=>__DEV__]
        ];
        const maxMenuItemDisplay = _.maxBy(menuItemsData, ([i, d, j]) => d.length)[1].length;
        const MenuItems = menuItemsData
            .filter(([key, display, cb, shouldRender]) => shouldRender === undefined || shouldRender())
            .map(([key, display, cb], idx) => this.renderMenuItem(maxMenuItemDisplay)(key, display, cb, idx));
        return (
            <CHSContent>
                <View style={{
                    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                    height: Dimensions.get('window').height, backgroundColor: Styles.defaultBackground
                }}>
                    <View style={this.columnStyle}>
                        <Button transparent large onPress={this.sync.bind(this)} style={{justifyContent: 'center'}}>
                            {this.renderSyncButton()}
                        </Button>
                        <Text style={Styles.menuTitle}>Sync Data</Text>
                    </View>
                    {MenuItems}
                </View>
            </CHSContent>
        );
    }
}

export default MenuView;
