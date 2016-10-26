import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";

@Path('/IndividualEncounterView')
class IndividualEncounterView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualEncounterView";
    }

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (<View />);
    }
}

export default IndividualEncounterView;