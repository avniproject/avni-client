import {Alert, Clipboard, NativeModules, Text, View, BackHandler, Image, FlatList} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import './views';
import _ from "lodash";
import {RegisterAndScheduleJobs} from "./AvniBackgroundJob";
import ErrorHandler from "./utility/ErrorHandler";
import FileSystem from "./model/FileSystem";
import GlobalContext from "./GlobalContext";
import RNRestart from 'react-native-restart';
import AppStore from "./store/AppStore";
import RealmFactory from "./framework/db/RealmFactory";
import General from "./utility/General";
import EnvironmentConfig from "./framework/EnvironmentConfig";
import Config from './framework/Config';
import JailMonkey from 'jail-monkey';

const {TamperCheckModule} = NativeModules;
import KeepAwake from 'react-native-keep-awake';
import moment from "moment";

class App extends Component {
    static childContextTypes = {
        getService: PropTypes.func.isRequired,
        getDB: PropTypes.func.isRequired,
        getStore: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        FileSystem.init();
        this.getBean = this.getBean.bind(this);
        this.handleError = this.handleError.bind(this);
        ErrorHandler.set(this.handleError);
        this.state = {error: '', isInitialisationDone: false, isDeviceRooted: false};
    }

    handleError(error, stacktrace) {
        //It is possible for App to not be available during this time, so check if state is available before setting to it
        this.setState && this.setState({error, stacktrace});
    }

    getChildContext = () => ({
        getDB: () => GlobalContext.getInstance().db,
        getService: (serviceName) => {
            return GlobalContext.getInstance().beanRegistry.getService(serviceName);
        },
        getStore: () => GlobalContext.getInstance().reduxStore,
    });

    renderError() {
        const clipboardString = `${this.state.error.message}\nStacktrace:${this.state.stacktrace}`;
        General.logError("App", `renderError: ${clipboardString}`);

        if (EnvironmentConfig.inNonDevMode() && !Config.allowServerURLConfig) {
            Alert.alert("App will restart now", this.state.error.message,
                [
                    {
                        text: "Copy error and Restart",
                        onPress: () => {
                            Clipboard.setString(clipboardString);
                            RNRestart.Restart();
                        }
                    }
                ],
                {cancelable: false}
            );
        }
        return <View/>;
    }

    renderRootedDeviceErrorMessageAndExitApplication() {
        const clipboardString = `This is a Rooted Device. Exiting Avni application due to security considerations.`;
        General.logError("App", `renderError: ${clipboardString}`);
        Alert.alert("App will exit now", clipboardString,
            [
                {
                    text: "Ok",
                    onPress: () => {
                        BackHandler.exitApp();
                    }
                }
            ],
            {cancelable: false}
        );
        return <View/>;
    }

    getBean(name) {
        return GlobalContext.getInstance().beanRegistry.getService(name);
    }

    async componentDidMount() {
        General.logDebug("App", "componentDidMount");
        try {
            if (!_.isNil(TamperCheckModule)) TamperCheckModule.validateAppSignature();

            const isThisProdLFEAppRunningOnRootedDevice = EnvironmentConfig.isProdAndDisallowedOnRootDevices() && JailMonkey.isJailBroken();
            if (isThisProdLFEAppRunningOnRootedDevice) {
                this.setState(state => ({...state, isDeviceRooted: isThisProdLFEAppRunningOnRootedDevice}));
                return;
            }

            const globalContext = GlobalContext.getInstance();
            if (!globalContext.isInitialised()) {
                await globalContext.initialiseGlobalContext(AppStore, RealmFactory);
                globalContext.routes = PathRegistry.routes();
            }

            const entitySyncStatusService = globalContext.beanRegistry.getService("entitySyncStatusService");
            entitySyncStatusService.setup();

            RegisterAndScheduleJobs();
            this.setState(state => ({...state, isInitialisationDone: true}));
        } catch (e) {
            console.log("App", e);
            this.setState(state => ({...state, error: e}));
        }
    }

    render() {
        if (this.state.isDeviceRooted) {
            return this.renderRootedDeviceErrorMessageAndExitApplication();
        }
        if (this.state.error) {
            return this.renderError();
        }
        if (!_.isNil(GlobalContext.getInstance().routes) && this.state.isInitialisationDone) {
            return GlobalContext.getInstance().routes
        }
        const message = `Upgrading Database. May take upto 15 minutes on slow devices with a lot of Avni data.`;
        return (
            <View style={{flex: 1, flexDirection: "column", alignItems: 'center', justifyContent: 'center', marginTop: 50}}>
                <Image source={{uri: `asset:/logo.png`}}
                       style={{height: 120, width: 120, alignSelf: 'center'}} resizeMode={'center'}/>

                <KeepAwake/>
                <Text style={{fontSize: 17, paddingHorizontal: 10, marginBottom: 20}}>{message}</Text>
                <FlatList
                    data={[
                        {key: '- Please do not close the App'},
                        {key: '- Please do not power-off screen'},
                        {key: '- App will keep screen ON by itself'},
                        {key: `- Start Time: ${moment().format("hh:mm")}`},
                        {key: `- REPORT ERROR IF NOT COMPLETE BEFORE: ${moment().add(15, "minutes").format("hh:mm")}`}
                    ]}
                    renderItem={({item}) => {
                        return (
                            <View>
                                <Text style={{fontSize: 15}}>{item.key}</Text>
                            </View>
                        );
                    }}
                />
            </View>);
    }
}

export default App;
