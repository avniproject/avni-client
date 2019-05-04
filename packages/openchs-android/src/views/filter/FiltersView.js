import React from "react";
import {StyleSheet, Text, View, Dimensions, TouchableOpacity} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Distances from '../primitives/Distances'
import SingleSelectFilter from './SingleSelectFilter';
import MultiSelectFilter from './MultiSelectFilter';
import Filter from "openchs-models/src/application/Filter";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import CHSContent from "../common/CHSContent";
import Reducers from "../../reducer";
import {FilterActionNames} from "../../action/mydashboard/FiltersActions";
import AddressLevels from "../common/AddressLevels";
import _ from "lodash";
import DatePicker from "../primitives/DatePicker";


@Path('/FilterView')
class FilterView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "FilterView";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.filterAction);
        this.filterMap = new Map([[Filter.types.SingleSelect, SingleSelectFilter],
            [Filter.types.MultiSelect, MultiSelectFilter]]);
    }

    componentWillMount() {
        this.dispatchAction(FilterActionNames.ON_LOAD, {
            filters: this.props.filters,
            locationSearchCriteria: this.props.locationSearchCriteria,
            addressLevelState: this.props.addressLevelState,
            filterDate: this.props.filterDate,
        });
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
            if (!_.isNil(newFilter)) {
                this.dispatchAction(FilterActionNames.ADD_FILTER, {filter: newFilter});
            }
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
        this.dispatchAction(this.props.actionName, {
            filters: this.state.filters,
            locationSearchCriteria: this.state.locationSearchCriteria,
            addressLevelState: this.state.addressLevelState,
            selectedLocations: this.state.addressLevelState.selectedAddresses,
            filterDate: this.state.filterDate.value,
        });
        this.goBack();
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
                            <View style={{flexDirection: "column", justifyContent: "flex-start"}}>
                                <Text style={{fontSize: 15, color: Styles.greyText}}>Date</Text>
                                <DatePicker
                                    nonRemovable={true}
                                    actionName={FilterActionNames.ON_DATE}
                                    actionObject={this.state.filterDate}
                                    pickTime={false}
                                    dateValue={this.state.filterDate.value}/>
                            </View>
                            {_.map(filters, (f, idx) => this.renderFilter(f, idx))}
                            <AddressLevels
                                addressLevelState={this.state.addressLevelState}
                                onSelect={(addressLevelState) => {
                                    this.dispatchAction(FilterActionNames.INDIVIDUAL_SEARCH_ADDRESS_LEVEL, {
                                        addressLevelState: addressLevelState
                                    })
                                }}
                                multiSelect={true}/>
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
