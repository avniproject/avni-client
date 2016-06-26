import Path, {PathRoot} from '../routing/Path'
import React, {Component, ProgressBarAndroid, View} from 'react-native'
import ConceptData from "../service/ConceptData"
import ConfigurationData from '../service/ConfigurationData'
import TypedTransition from '../routing/TypedTransition'
import DiseaseListView from "./diseaseList/DiseaseListView"
import AppState from '../hack/AppState'
import {Messages} from "../utility/Messages"

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

            if (fileLoaded === true) {
                AppState.loadingCompleted = true;
                console.trace(`File system data loaded`);
                clearInterval(intervalID);
                new Messages().addTerminologyMessages(ConceptData);
                TypedTransition.from(this).to(DiseaseListView);
            }
        }, 300);

        return <ProgressBarAndroid />;
    }
}

export default LoadingView;