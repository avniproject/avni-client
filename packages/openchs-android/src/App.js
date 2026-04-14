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
import DeepLinkHandler from "./utility/DeepLinkHandler";
import CHSNavigator from "./utility/CHSNavigator";

const {TamperCheckModule} = NativeModules;

class App extends Component {
    constructor(props, context) {
        super(props, context);
        FileSystem.init();
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

            // Initialize deep link handling after app is ready
            this.initializeDeepLinks();
        } catch (e) {
            console.log("App", e);
            this.handleError(ErrorUtil.getAvniErrorSync(e));
            ErrorUtil.notifyBugsnag(e, "App");
        }
    }

    initializeDeepLinks() {
        // Set up deep link handler
        DeepLinkHandler.initialize((parsedLink) => {
            this.handleDeepLinkNavigation(parsedLink);
        });

        // Check if app was opened via deep link
        const pendingDeepLink = DeepLinkHandler.getPendingDeepLink();
        if (pendingDeepLink) {
            General.logDebug("App", "Processing pending deep link from cold start");
            // Delay processing to ensure app is fully loaded
            setTimeout(() => {
                DeepLinkHandler.handleDeepLink(pendingDeepLink, (parsedLink) => {
                    this.handleDeepLinkNavigation(parsedLink);
                });
            }, 1000);
        }
    }

    handleDeepLinkNavigation(parsedLink) {
        General.logDebug("App", "Handling deep link navigation:", parsedLink);
        
        const { type, id, entityType, rawParams } = parsedLink;
        
        // Navigate based on deep link type
        switch (type) {
            case 'enrollment':
            case 'encounter':
            case 'registration':
                // Navigate to the appropriate form
                // The actual navigation will be handled by the current view
                // Store the deep link info in global context for the view to use
                const globalContext = GlobalContext.getInstance();
                globalContext.pendingDeepLink = parsedLink;
                
                // If user is not logged in, they should be on login screen
                // The login screen can handle redirecting after authentication
                General.logDebug("App", `Deep link stored for ${type} form. Type: ${type}, ID: ${id}`);
                break;
            
            default:
                General.logDebug("App", `Unknown deep link type: ${type}`);
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
