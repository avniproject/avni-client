import PropTypes from 'prop-types';
import React from "react";
import {ListView, StyleSheet, Text, View, Dimensions, TouchableOpacity} from 'react-native';
import {Button} from 'native-base';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Distances from '../primitives/Distances'
import SingleSelectFilter from './SingleSelectFilter';
import MultiSelectFilter from './MultiSelectFilter';
import {  Filter  } from 'openchs-models';
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import CHSContent from "../common/CHSContent";
import CHSNavigator from "../../utility/CHSNavigator";
import Reducers from "../../reducer";
import {FilterActionNames, FiltersActions} from "../../action/mydashboard/FiltersActions";


@Path('/FilterView')
class FilterView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "FilterView";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.FilterAction);
        this.filterMap = new Map([[Filter.types.SingleSelect, SingleSelectFilter],
            [Filter.types.MultiSelect, MultiSelectFilter]]);
    }

    componentWillMount() {
        this.dispatchAction(FilterActionNames.ON_LOAD, {filters: this.props.filters});
        super.componentWillMount();
    }


    static styles = StyleSheet.create({
        container: {
            marginRight: Distances.ScaledContentDistanceFromEdge,
            marginLeft: Distances.ScaledContentDistanceFromEdge,
            padding: 10,
            backgroundColor: Styles.whiteColor
        },
        floatingButton: {
            position: 'absolute',
            width: '100%',
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center',
            bottom: 0,
            backgroundColor: Colors.AccentColor
        },

        floatingButtonIcon: {
            color: Colors.TextOnPrimaryColor
        }
    });

    onSelect(filter, idx) {
        return (val) => {
            const newFilter = filter.selectOption(val);
            this.dispatchAction(FilterActionNames.ADD_FILTER, {filter: newFilter});
        }
    }

    renderFilter(filter, idx) {
        const Elem = this.filterMap.get(filter.type);
        return (
            <View key={idx}>
                <Elem filter={filter} onSelect={this.onSelect(filter, idx)}/>
            </View>)
    }

    onApply() {
        this.dispatchAction(this.props.actionName, {filters: this.state.filters});
        CHSNavigator.goBack(this);
    }

    render() {
        const {width} = Dimensions.get('window');
        const filters = this.state.filters ? Array.from(this.state.filters.values()) : [];
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('Filter')} func={this.props.onBack}/>
                <CHSContent>
                    <View style={{backgroundColor: Styles.whiteColor}}>
                        <View style={[FilterView.styles.container, {width: width * 0.88, alignSelf: 'center'}]}>
                            {_.map(filters, (f, idx) => this.renderFilter(f, idx))}
                        </View>
                    </View>
                </CHSContent>
                <TouchableOpacity activeOpacity={0.5}
                                  onPress={() => this.onApply()}
                                  style={FilterView.styles.floatingButton}>
                    <Text style={{
                        fontSize: 25,
                        color: Colors.TextOnPrimaryColor,
                        alignSelf: "center"
                    }}>Apply</Text>
                </TouchableOpacity>
            </CHSContainer>
        );
    }
}

export default FilterView;
