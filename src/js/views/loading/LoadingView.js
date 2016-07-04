import Path, {PathRoot} from '../../routing/Path'
import {ProgressBarAndroid, View, Text} from 'react-native'
import React, {Component} from 'react';
import ConceptData from "../../service/ConceptData"
import ConfigurationData from '../../service/ConfigurationData'
import TypedTransition from '../../routing/TypedTransition'
import DiseaseListView from "./../diseaseList/DiseaseListView"
import AppState from '../../hack/AppState'
import {Messages} from "../../utility/Messages"
import FileSystemGateway from "../../service/gateway/FileSystemGateway"
import ErrorView from "../error/ErrorView";

@PathRoot
@Path('/loadingView')
class LoadingView extends Component {
    static contextTypes = {
        navigator: React.PropTypes.func.isRequired
    };

    render() {
        if (AppState.loadingCompleted) {
            return (<View />);
        }

        var fileLoaded = false;
        AppState.loadingCompleted = false;
        const intervalID = setInterval(() => {
            if (fileLoaded === false)
                fileLoaded = ConceptData.initialised && ConfigurationData.initialised;

            if (fileLoaded === true && ConceptData.errorMessage === undefined && ConfigurationData.errorMessage === undefined) {
                AppState.loadingCompleted = true;
                console.trace(`File system data loaded`);
                clearInterval(intervalID);
                new Messages().addTerminologyMessages(ConceptData);
                TypedTransition.from(this).to(DiseaseListView);
            } else if (fileLoaded === true) {
                AppState.loadingCompleted = true;
                console.trace(`File system data loading error`);
                clearInterval(intervalID);
                var queryParams = {errors: [ConceptData.errorMessage, ConfigurationData.errorMessage]};
                TypedTransition.from(this).with(queryParams).to(ErrorView);
            }
        }, 300);

        return (
            <View>
                <Text style={{flex: 0.6, fontSize: 20, color: '#0C59CF'}}>{FileSystemGateway.basePath}</Text>
                <ProgressBarAndroid />
            </View>
        );
    }
}

export default LoadingView;