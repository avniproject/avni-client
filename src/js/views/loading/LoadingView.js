import Path, {PathRoot} from '../../framework/routing/Path'
import {ProgressBarAndroid, View, Text} from 'react-native'
import React, {Component} from 'react';
import TypedTransition from '../../framework/routing/TypedTransition'
import DiseaseListView from "./../diseaseList/DiseaseListView"
import AppState from '../../hack/AppState'
import FileSystemGateway from "../../service/gateway/FileSystemGateway"

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
            AppState.loadingCompleted = true;
            console.trace(`File system data loaded`);
            clearInterval(intervalID);
            TypedTransition.from(this).to(DiseaseListView);
        }, 500);

        return (
            <View>
                <Text style={{flex: 0.6, fontSize: 20, color: '#0C59CF'}}>{FileSystemGateway.basePath}</Text>
                <ProgressBarAndroid />
            </View>
        );
    }
}

export default LoadingView;