import React from "react";
import {Dimensions, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Distances from '../primitives/Distances'
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Path from "../../framework/routing/Path";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import CHSContent from "../common/CHSContent";
import Reducers from "../../reducer";
import {FilterActionNames} from "../../action/mydashboard/FiltersActionsV2";
import AddressLevels from "../common/AddressLevels";
import General from "../../utility/General";
import CustomFilters from "./CustomFilters";
import GenderFilter from "./GenderFilter";
import CustomActivityIndicator from "../CustomActivityIndicator";
import {ScrollView} from "native-base";
import PropTypes from "prop-types";
import ObservationBasedFilterView from "./ObservationBasedFilterView";

@Path('/FilterViewV2')
class FiltersViewV2 extends AbstractComponent {
    static propTypes = {
        dashboardUUID: PropTypes.string.isRequired,
        addressLevelState: PropTypes.object.isRequired
    };

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
            height: 50,
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

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.filterActionV2);
    }

    viewName() {
        return "FilterViewV2";
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(FilterActionNames.ON_LOAD, {dashboardUUID: this.props.dashboardUUID});
        super.UNSAFE_componentWillMount();
    }

    onApply() {
        this.dispatchAction(FilterActionNames.BEFORE_APPLY_FILTER, {status: true});
        setTimeout(() => this.applyFilters(), 0);
        // this.goBack();
    }

    applyFilters() {
        return this.dispatchAction(FilterActionNames.APPLIED_FILTER, {});
    }

    onHardwareBackPress() {
        this.props.onBack();
        return true;
    }

    dispatchFilterUpdate(filter, value) {
        this.dispatchAction(FilterActionNames.ON_FILTER_UPDATE, {filter: filter, value: value});
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const {width} = Dimensions.get('window');

        const {addressLevelState, loading, filterConfigs, filters, selectedValues, validationResults} = this.state;

        return (
            <CHSContainer style={{backgroundColor: Styles.whiteColor}}>
                <AppHeader title={this.I18n.t('filter')} func={this.props.onBack}/>
                <ScrollView keyboardShouldPersistTaps="handled">
                    <CHSContent>
                        <View style={{backgroundColor: Styles.whiteColor}}>
                            <CustomActivityIndicator loading={loading}/>
                            <View style={[FiltersViewV2.styles.container, {width: width * 0.88, alignSelf: 'center'}]}>
                                {filters.map((filter) => {
                                    const filterConfig = filterConfigs[filter.uuid];
                                    const inputDataType = filterConfig.getInputDataType();
                                    const filterValue = selectedValues[filter.uuid];
                                    const validationResult = validationResults[filter.uuid];
                                    switch (inputDataType) {
                                        case "Gender":
                                            return <GenderFilter selectedGenders={filterValue}
                                                                 onSelect={(selectedGenders) => this.dispatchFilterUpdate(filter, selectedGenders)}/>;
                                        case "Address":
                                            return <AddressLevels addressLevelState={addressLevelState}
                                                                  onSelect={(updatedAddressLevelState) => this.dispatchFilterUpdate(filter, updatedAddressLevelState)}
                                                                  multiSelect={true}/>;
                                        default:
                                            return <ObservationBasedFilterView onChange={(x) => this.dispatchFilterUpdate(filter, x)}
                                                                               filter={filter}
                                                                               observationBasedFilter={filterConfig.observationBasedFilter}
                                                                               validationResult={validationResult} value={filterValue}/>;
                                    }
                                })}
                            </View>
                        </View>
                    </CHSContent>
                </ScrollView>
                <TouchableOpacity activeOpacity={0.5}
                                  onPress={() => this.onApply()}
                                  style={FiltersViewV2.styles.floatingButton}>
                    <Text style={{
                        fontSize: Styles.normalTextSize,
                        color: Colors.TextOnPrimaryColor,
                        alignSelf: "center"
                    }}>Apply</Text>
                </TouchableOpacity>
            </CHSContainer>
        );
    }
}

export default FiltersViewV2;
