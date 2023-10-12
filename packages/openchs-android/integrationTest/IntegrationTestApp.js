import {Button, LogBox, SectionList, Text, View, StyleSheet} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import FileSystem from "../src/model/FileSystem";
import GlobalContext from "../src/GlobalContext";
import AppStore from "../src/store/AppStore";
import RealmFactory from "../src/framework/db/RealmFactory";
import PersonRegisterActionsIntegrationTest from "./PersonRegisterActionsIntegrationTest";
import RNRestart from 'react-native-restart';
import DatabaseTest from "./DatabaseTest";
import IntegrationTestRunner, {TestSuite} from "./IntegrationTestRunner";
import UtilTest from "./UtilTest";
import UserInfoServiceTest from "./UserInfoServiceTest";

const itemCommonStyle = {
    padding: 10,
    marginVertical: 8,
    display: "flex",
    flexDirection: "row",
    flex: 1
}

const styles = StyleSheet.create({
    item: {
        ...itemCommonStyle
    },
    success: {
        backgroundColor: 'green',
        ...itemCommonStyle
    },
    failure: {
        backgroundColor: 'red',
        ...itemCommonStyle
    },
    header: {
        backgroundColor: '#fff',
        flexDirection: "row",
        flex: 1,
        justifyContent: "space-between"
    },
    headerText: {
        fontSize: 20,
        paddingLeft: 10
    },
    title: {
        fontSize: 14,
        backgroundColor: '#f9c2ff',
        flex: 0.9
    },
});

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
        this.integrationTestRunner = new IntegrationTestRunner(UserInfoServiceTest, DatabaseTest, PersonRegisterActionsIntegrationTest, UtilTest);
        this.state = {isInitialisationDone: false, integrationTests: this.integrationTestRunner.testSuite};
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
        // setTimeout(() => this.integrationTestRunner.run((x) => this.testRunObserver(x)), 100);
    }

    testRunObserver(integrationTests) {
        this.setState({integrationTests: integrationTests});
    }

    render() {
        const {integrationTests} = this.state;
        const dataSource = _.map(_.groupBy(integrationTests.testMethods, (x) => x.testClass.name), (testMethods, testClassName) => {
            return {title: testClassName, data: testMethods, testClass: testMethods[0].testClass};
        });

        LogBox.ignoreAllLogs();
        if (this.state.isInitialisationDone) {
            return <View style={{flex: 1, alignItems: 'center', justifyContent: "space-around", backgroundColor: "black", flexDirection: "column"}}>
                <SectionList
                    sections={dataSource}
                    keyExtractor={(x) => x.toString()}
                    renderItem={({item}) => {
                        const itemStyle = _.isNil(item.successful) ? styles.item : (item.successful ? styles.success : styles.failure);
                        return <View style={itemStyle}>
                            <Text style={styles.title}>{item.methodName}</Text>
                            <Button title={"Run"} onPress={() => this.integrationTestRunner.runMethod((x) => this.testRunObserver(x), item)}/>
                            <Button title={"Run & Throw"} onPress={() => this.integrationTestRunner.runMethod((x) => this.testRunObserver(x), item, true)}/>
                        </View>
                    }
                    }
                    renderSectionHeader={({section: {title, testClass}}) => (
                        <View style={styles.header}>
                            <Text style={styles.headerText}>{title}</Text>
                            <View style={{display: "flex", flexDirection: "row"}}>
                                <Button title={"Run"} onPress={() => this.integrationTestRunner.runClass((x) => this.testRunObserver(x), testClass)}/>
                                <Button title={"Run & Throw"} onPress={() => this.integrationTestRunner.runClass((x) => this.testRunObserver(x), testClass, true)}/>
                            </View>
                        </View>
                    )}
                />
                <Button title="Run All" onPress={() => {
                    this.integrationTestRunner.run((x) => this.testRunObserver(x));
                }}/>
                <Button title="Restart App" onPress={() => RNRestart.Restart()}/>
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
