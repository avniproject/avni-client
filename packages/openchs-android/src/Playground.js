import PropTypes from 'prop-types';
import React, {Component} from 'react';
import BeanRegistry from './framework/bean/BeanRegistry';
import Realm from 'realm';
import {createRealmConfig, EntityMetaData} from 'openchs-models';
import './views';
import EntitySyncStatusService from "./service/EntitySyncStatusService";
import themes from "./views/primitives/themes";
import CHSContainer from "./views/common/CHSContainer";
import CHSContent from "./views/common/CHSContent";
import {Text} from "react-native";
import {createStore} from "redux";

let beans, mockStore, db = undefined;

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
        if (db === undefined) {
            db = new Realm(createRealmConfig());
            beans = BeanRegistry.init(db);
            mockStore = createStore((state, action) => this.mockReducer(state, action), {});
            const entitySyncStatusService = beans.get(EntitySyncStatusService);
            entitySyncStatusService.setup(EntityMetaData.model());
        }
        this.getBean = this.getBean.bind(this);
    }

    //This mock reducer can be used to perform any specific state changes you need to test out a component
    mockReducer(state, action) {
        switch (action.type) {
            case 'AN_ACTION_NAME': {
                this.setState({value: action.value});
            }
        }
    }

    static childContextTypes = {
        getService: PropTypes.func.isRequired,
        getDB: PropTypes.func.isRequired,
        getStore: PropTypes.func.isRequired,
        navigator: PropTypes.func.isRequired,
    };

    handleError(error, stacktrace) {
        this.setState({error, stacktrace});
    }

    //Note that the store and navigator are mocked in this implementation
    getChildContext = () => ({
        getDB: () => db,
        getService: (serviceName) => {
            return beans.get(serviceName)
        },
        getStore: () => mockStore,
        navigator: () => null
    });

    getBean(name) {
        return beans.get(name);
    }

    render() {
        return (<CHSContainer>
            <CHSContent>
                <Text>
                    This is your playground to try out new components.
                    You can go to the default app by adding playground=false in your .env file.
                </Text>
            </CHSContent>
        </CHSContainer>)
    }
}
