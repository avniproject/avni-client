import React from "react";
import {View, StyleSheet, ListView, Text} from 'react-native';
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import AppHeader from "../common/AppHeader";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AddressVisitRow from './AddressVisitRow';
import Distances from '../primitives/Distances'
import Separator from '../primitives/Separator';
import FunctionalHeader from "../common/FunctionalHeader";
import DatePicker from "../primitives/DatePicker";
import ProgramFilter from './ProgramFilter';
import HighRiskFilter from './HighRiskFilter';
import VoidedFilter from './VoidedFilter';

class FilterView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "FilterView";
    }

    constructor(props, context) {
        super(props, context);
        this.ds = new ListView.DataSource({rowHasChanged: () => false});
        this.filters = [
            ["Program", ProgramFilter],
            ["High Risk", HighRiskFilter],
            ["Voided Filter", VoidedFilter]
        ];
    }

    static styles = StyleSheet.create({
        container: {
            marginRight: Distances.ScaledContentDistanceFromEdge,
            marginLeft: Distances.ScaledContentDistanceFromEdge
        }
    });

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        super.componentWillMount();
    }

    render() {
        const dataSource = this.ds.cloneWithRows(this.filters);
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('filters')}/>
                <CHSContent>
                    <View style={FilterView.styles.container}>
                        <ListView dataSource={dataSource}
                                  initialListSize={3}
                                  removeClippedSubviews={true}
                                  renderSeparator={(ig, idx) => (<Separator key={idx} height={2}/>)}
                                  renderRow={([name, ViewComp]) => <ViewComp/>}
                        />}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default FilterView;