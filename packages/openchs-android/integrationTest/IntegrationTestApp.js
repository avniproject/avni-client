import {Button, LogBox, Text, View} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import FileSystem from "../src/model/FileSystem";
import GlobalContext from "../src/GlobalContext";
import AppStore from "../src/store/AppStore";
import RealmFactory from "../src/framework/db/RealmFactory";
import PersonRegisterActionsIntegrationTest from "./PersonRegisterActionsIntegrationTest";
import RNRestart from 'react-native-restart';

class IntegrationTestApp extends Component {
    static childContextTypes = {
        getService: PropTypes.func.isRequired,
        getDB: PropTypes.func.isRequired,
        getStore: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        FileSystem.init();
        this.getBean = this.getBean.bind(this);
        this.state = {isInitialisationDone: false};
    }

    getChildContext = () => ({
        getDB: () => GlobalContext.getInstance().db,
        getService: (serviceName) => {
            return GlobalContext.getInstance().beanRegistry.getService(serviceName);
        },
        getStore: () => GlobalContext.getInstance().reduxStore,
    });

    getBean(name) {
        return GlobalContext.getInstance().beanRegistry.getService(name);
    }

    async componentDidMount() {
        const globalContext = GlobalContext.getInstance();
        if (!globalContext.isInitialised()) {
            await globalContext.initialiseGlobalContext(AppStore, RealmFactory);
        }
        this.setState(state => ({...state, isInitialisationDone: true}));
    }

    render() {
        LogBox.ignoreAllLogs();

        if (this.state.isInitialisationDone) {
            return <View style={{flex: 1, alignItems: 'center', justifyContent: "space-around", backgroundColor: "black", flexDirection: "row"}}>
                <Button title="Run Test" onPress={() => {
                    const personRegisterActionsIntegrationTest = new PersonRegisterActionsIntegrationTest();
                    // personRegisterActionsIntegrationTest.setup().person_registration_should_show_worklist_correctly(IntegrationTestContext);
                    personRegisterActionsIntegrationTest.setup().person_registration_via_add_member_should_show_worklist_correctly(IntegrationTestContext);
                }}/>
                <Button title="Restart Test App" onPress={() => RNRestart.Restart()}/>
            </View>;
        }
        return <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', color: "white", backgroundColor: "black"}}>
            <Text>Loading...</Text>
        </View>;
    }
}

class IntegrationTestContext {
    static starting(testArguments) {
        console.log("Starting", testArguments.callee.name);
    }

    static ending(testArguments) {
        console.log("Ending", testArguments.callee.name);
    }
}

export default IntegrationTestApp;
