import {Alert, BackHandler, Image, NativeModules, Text, View, FlatList} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import './views';
import _ from "lodash";

// Import all services to ensure @Service decorators execute
// Must be imported before GlobalContext.initialiseGlobalContext() is called
import './service/AllServices';
import {RegisterAndScheduleJobs} from "./AvniBackgroundJob";
import ErrorHandler from "./utility/ErrorHandler";
import FileSystem from "./model/FileSystem";
import GlobalContext from "./GlobalContext";
import AppStore from "./store/AppStore";
import RealmFactory from "./framework/db/RealmFactory";
import General from "./utility/General";
import EnvironmentConfig from "./framework/EnvironmentConfig";
import JailMonkey from 'jail-monkey';
import KeepAwake from 'react-native-keep-awake';
import moment from "moment";
import AvniErrorBoundary from "./framework/errorHandling/AvniErrorBoundary";
import UnhandledErrorView from "./framework/errorHandling/UnhandledErrorView";
import ErrorUtil from "./framework/errorHandling/ErrorUtil";
import ServiceContext from "./framework/context/ServiceContext";
import Perf from "./utility/perf";

const {TamperCheckModule} = NativeModules;

class App extends Component {
    constructor(props, context) {
        super(props, context);
        // avni-client#2084: runs in the constructor, so it precedes every other startup mark. ~15 mkdir
        // calls plus a recursive migrateOldData; on a dirty shutdown the first FS touch contends with
        // WAL recovery on the realm file, which is the multi-minute stall RC3 names.
        Perf.time("startup.fileSystemInit", () => FileSystem.init());
        this.getBean = this.getBean.bind(this);
        this.handleError = this.handleError.bind(this);
        ErrorHandler.set(this.handleError);
        this.state = {avniError: null, isInitialisationDone: false, isDeviceRooted: false};
    }

    handleError(avniError) {
        //It is possible for App to not be available during this time, so check if state is available before setting to it
        this.setState && this.setState({avniError: avniError});
    }

    getContextValue = () => ({
        getDB: () => GlobalContext.getInstance().db,
        getService: (serviceClassOrName) => {
            return GlobalContext.getInstance().beanRegistry.getService(serviceClassOrName);
        },
        getStore: () => GlobalContext.getInstance().reduxStore,
    });

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
        Perf.mark("startup.componentDidMount.begin");
        const _tCdm = Date.now();
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
                globalContext.routes = Perf.time("startup.pathRegistryRoutes", () => PathRegistry.routes());
            }

            const entitySyncStatusService = globalContext.beanRegistry.getService("entitySyncStatusService");
            // A realm write per missing entity, on every launch (avni-client#2084).
            Perf.time("startup.entitySyncStatusSetup", () => entitySyncStatusService.setup());

            Perf.time("startup.registerAndScheduleJobs", () => RegisterAndScheduleJobs());
            // Fires immediately before isInitialisationDone flips, so the interval between this and the
            // first LandingView mark is exactly the first-paint boundary: it says whether the wait the
            // worker reports happens behind the "Upgrading Database" splash or on a screen that will
            // not respond. (avni-client#2084)
            Perf.mark("startup.componentDidMount.end", () => ({ms: Date.now() - _tCdm}));
            this.setState(state => ({...state, isInitialisationDone: true}));
        } catch (e) {
            console.log("App", e);
            this.handleError(ErrorUtil.getAvniErrorSync(e));
            ErrorUtil.notifyBugsnag(e, "App");
        }
    }

    renderApp() {
        if (this.state.isDeviceRooted) {
            return this.renderRootedDeviceErrorMessageAndExitApplication();
        }
        if (this.state.avniError) {
            return <UnhandledErrorView avniError={this.state.avniError}/>;
        }
        if (!_.isNil(GlobalContext.getInstance().routes) && this.state.isInitialisationDone) {
            return GlobalContext.getInstance().routes
        }
        const message = `Upgrading Database. May take upto 15 minutes on slow devices with a lot of Avni data.`;
        return (
            <View style={{flex: 1, flexDirection: "column", alignItems: 'center', justifyContent: 'center'}}>
                <Image source={{uri: `asset:/splash_logo.png`}}
                       style={{height: 120, width: 320, alignSelf: 'center'}} resizeMode={'contain'}/>

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

    render() {
        return (
            <ServiceContext.Provider value={this.getContextValue()}>
                <AvniErrorBoundary>
                    {this.renderApp()}
                </AvniErrorBoundary>
            </ServiceContext.Provider>
        );
    }
}

export default App;
