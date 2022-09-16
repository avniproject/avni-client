import React, {Component} from 'react';
import CHSContainer from "./views/common/CHSContainer";
import CHSContent from "./views/common/CHSContent";
import {Text} from "react-native";
import RealmExamples from "./codeExamples/RealmExamples";
import RealmFactory from "./framework/db/RealmFactory";
import './views';
import BeanRegistry from "./framework/bean/BeanRegistry";

const db = RealmFactory.createRealm();
BeanRegistry.init(db);

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
    }

    test() {
    }

    render() {
        this.test();
        return (<CHSContainer>
            <CHSContent>
                <Text>
                    This is your playground to try out new components.
                    You can go to the default app by adding PLAYGROUND=false in your .env file.
                </Text>
            </CHSContent>
        </CHSContainer>)
    }
}
