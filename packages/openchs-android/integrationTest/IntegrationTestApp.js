import {Button, LogBox, Text, View} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import FileSystem from "../src/model/FileSystem";
import GlobalContext from "../src/GlobalContext";
import AppStore from "../src/store/AppStore";
import RealmFactory from "../src/framework/db/RealmFactory";
import PersonRegisterActionsIntegrationTest from "./PersonRegisterActionsIntegrationTest";

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
            console.log("IntegrationTestApp", "componentDidMount");
            await globalContext.initialiseGlobalContext(AppStore, RealmFactory);
            console.log("IntegrationTestApp", "componentDidMount2");
        }
        console.log("IntegrationTestApp", "componentDidMount4");
        this.setState(state => ({...state, isInitialisationDone: true}));
    }

    render() {
        console.log("IntegrationTestApp", `render. ${this.state.isInitialisationDone}, ${GlobalContext.getInstance().routes}`);
        LogBox.ignoreAllLogs();

        if (this.state.isInitialisationDone) {
            return <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: "black"}}>
                <Button title="Run Test" onPress={() => new PersonRegisterActionsIntegrationTest().last_page_of_registration_should_show_worklist_correctly(IntegrationTestContext)}/>
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
