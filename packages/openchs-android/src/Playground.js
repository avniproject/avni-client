import React, {Component} from 'react';
import PathRegistry from './framework/routing/PathRegistry';
import BeanRegistry from './framework/bean/BeanRegistry';
import Realm from 'realm';
import {Schema, EntityMetaData} from "openchs-models";
import './views';
import EntitySyncStatusService from "./service/EntitySyncStatusService";
import themes from "./views/primitives/themes";
import CHSContainer from "./views/common/CHSContainer";
import CHSContent from "./views/common/CHSContent";
import configureStore from 'redux-mock-store';
import {Text} from "react-native";

let routes, beans, reduxStore, db = undefined;

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
        if (db === undefined) {
            db = new Realm(Schema);
            beans = BeanRegistry.init(db, this);
            reduxStore = configureStore([])({});
            routes = PathRegistry.routes();
            const entitySyncStatusService = beans.get(EntitySyncStatusService);
            entitySyncStatusService.setup(EntityMetaData.model());
        }
        this.getBean = this.getBean.bind(this);
        this.state = {error: null}
    }

    static childContextTypes = {
        getService: React.PropTypes.func.isRequired,
        getDB: React.PropTypes.func.isRequired,
        getStore: React.PropTypes.func.isRequired,
    };

    handleError(error, stacktrace) {
        this.setState({error, stacktrace});
    }

    getChildContext = () => ({
        getDB: () => db,
        getService: (serviceName) => {
            return beans.get(serviceName)
        },
        getStore: () => reduxStore,
    });

    getBean(name) {
        return beans.get(name);
    }

    render() {
        return (<CHSContainer theme={themes}>
            <CHSContent>
                <Text>
                    This is your playground to try out new components.
                    You can go to the default app by adding playground=false in your .env file.
                </Text>
            </CHSContent>
        </CHSContainer>)
    }
}
