import {Button, LogBox, SectionList, StyleSheet, Text, View} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import FileSystem from "../src/model/FileSystem";
import GlobalContext from "../src/GlobalContext";
import AppStore from "../src/store/AppStore";
import RealmFactory from "../src/framework/db/RealmFactory";
import PersonRegisterActionsIntegrationTest from "./PersonRegisterActionsIntegrationTest";
import RNRestart from 'react-native-restart';
import DatabaseTest from "./DatabaseTest";
import IntegrationTestRunner from "./IntegrationTestRunner";
import UtilTest from "./UtilTest";
import UserInfoServiceTest from "./UserInfoServiceTest";
import RealmProxyTest from "./RealmProxyTest";
import ReportCardServiceIntegrationTest from "./ReportCardServiceIntegrationTest";
import RealmDBOperationsCascadeTest from "./RealmDBOperationsCascadeTest";
import EntityApprovalServiceTest from "./EntityApprovalServiceTest";
import IndividualIntegrationTest from "./model/IndividualIntegrationTest";
import General from "../src/utility/General";
import Icon from "react-native-vector-icons/Entypo";
import _ from 'lodash';
import {JSONStringify} from "../src/utility/JsonStringify";
import PruneMediaIntegrationTest from "./PruneMediaIntegrationTest";

const itemCommonStyle = {
    padding: 10,
    marginVertical: 8,
    display: "flex",
    flexDirection: "row",
    flex: 1
}

const headerCommonStyle = {
    fontSize: 20,
    paddingLeft: 10
};

const styles = StyleSheet.create({
    item: {
        ...itemCommonStyle,
        backgroundColor: "white"
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
        ...headerCommonStyle,
        backgroundColor: "white",
        flexBasis: 600
    },
    failedHeaderText: {
        ...headerCommonStyle,
        backgroundColor: 'red',
    },
    successHeaderText: {
        ...headerCommonStyle,
        backgroundColor: 'green'
    },
    title: {
        fontSize: 14,
        flex: 0.9
    }
});

class IntegrationTestApp extends Component {
    static childContextTypes = {
        getService: PropTypes.func.isRequired,
        getDB: PropTypes.func.isRequired,
        getStore: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        General.setCurrentLogLevel(General.LogLevel.Debug);
        LogBox.ignoreAllLogs();
        FileSystem.init();
        this.getBean = this.getBean.bind(this);
        this.integrationTestRunner = new IntegrationTestRunner(DatabaseTest, IndividualIntegrationTest, EntityApprovalServiceTest, ReportCardServiceIntegrationTest, UserInfoServiceTest, PersonRegisterActionsIntegrationTest, UtilTest, RealmProxyTest, PruneMediaIntegrationTest, RealmDBOperationsCascadeTest);
        this.state = {isInitialisationDone: false, testSuite: this.integrationTestRunner.testSuite, expandedTestClasses: []};
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

    testRunObserver(testSuite) {
        this.setState({testSuite: testSuite});
    }

    render() {
        const {testSuite, expandedTestClasses} = this.state;
        const dataSource = _.map(_.groupBy(testSuite.testMethods, (x) => x.testClass.name), (testMethods, testClassName) => {
            return {title: testClassName, data: testMethods, testClass: testMethods[0].testClass};
        });

        if (this.state.isInitialisationDone) {
            return <View style={{flex: 1, alignItems: 'center', justifyContent: "space-around", backgroundColor: "black", flexDirection: "column", paddingTop: 10}}>
                <SectionList
                    sections={dataSource}
                    keyExtractor={(x) => x.toString()}
                    renderSectionHeader={({section: {title, testClass}}) => {
                        const expanded = _.some(expandedTestClasses, (x) => x === testClass);
                        const testClassStatus = this.integrationTestRunner.testSuite.getStatus(testClass);
                        const color = _.isNil(testClassStatus) ? "white" : (testClassStatus ? "green" : "red");
                        return <View style={{flexDirection: "row", columnGap: 10, marginBottom: 10, backgroundColor: color}}>
                            <Icon name={expanded ? 'chevron-down' : 'chevron-right'} style={{
                                color: '#29869A',
                                alignSelf: 'center',
                                fontSize: 24
                            }
                            } onPress={() => this.testClassToggled(testClass)}/>
                            <Text style={styles.headerText} onPress={() => this.testClassToggled(testClass)}>{title}</Text>
                            <View style={{display: "flex", flexDirection: "row", columnGap: 10}}>
                                <Button title={"Run"} onPress={() => this.integrationTestRunner.runClass((x) => this.testRunObserver(x), testClass)}/>
                                <Button title={"Run & Throw"} onPress={() => this.integrationTestRunner.runClass((x) => this.testRunObserver(x), testClass, true)}/>
                            </View>
                        </View>
                    }}
                    renderItem={({item: testMethod}) => {
                        const expanded = _.some(expandedTestClasses, (x) => x === testMethod.testClass);
                        const itemStyle = testMethod.hasRun() ? (testMethod.isSuccessful() ? styles.success : styles.failure) : styles.item;
                        return expanded ?
                            <View style={{...itemStyle, marginLeft: 50}}>
                                <Text style={styles.title}
                                      onPress={() => this.integrationTestRunner.runMethod((x) => this.testRunObserver(x), testMethod, true)}>{testMethod.methodName}</Text>
                                <Button title={"Run"} onPress={() => this.integrationTestRunner.runMethod((x) => this.testRunObserver(x), testMethod)}/>
                                <Button title={"Run & Throw"} onPress={() => this.integrationTestRunner.runMethod((x) => this.testRunObserver(x), testMethod, true)}/>
                            </View> : null;
                    }
                    }
                />
                <View style={{flexDirection: "row", marginTop: 50}}>
                    <Button title="Run All" onPress={() => {
                        this.integrationTestRunner.run((x) => this.testRunObserver(x));
                    }}/>
                    <Button title="Restart App" onPress={() => RNRestart.Restart()}/>
                </View>
            </View>;
        }
        return <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', color: "white", backgroundColor: "black"}}>
            <Text>Loading...</Text>
        </View>;
    }

    testClassToggled(testClass) {
        const {expandedTestClasses} = this.state;
        if (_.remove(expandedTestClasses, (x) => x === testClass).length === 1) {
            this.setState({expandedTestClasses: [...expandedTestClasses]});
        } else
            this.setState({expandedTestClasses: [...expandedTestClasses, testClass]});
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
