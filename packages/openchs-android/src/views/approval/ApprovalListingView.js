import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import General from "../../utility/General";
import {FlatList, SafeAreaView, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import React from "react";
import DropDownPicker from 'react-native-dropdown-picker';
import {getUnderlyingRealmCollection, Individual, ReportCard} from 'openchs-models';
import EntityService from "../../service/EntityService";
import ReportCardService from "../../service/customDashboard/ReportCardService";
import Icon from 'react-native-vector-icons/FontAwesome';
import FormMappingService from "../../service/FormMappingService";
import SubjectApprovalView from "./SubjectApprovalView";

const placeHolderPicker = {label: 'All', value: null};

@Path('/approvalListingView')
class ApprovalListingView extends AbstractComponent {
    static propTypes = {
        results: PropTypes.object.isRequired,
        onApprovalSelection: PropTypes.func.isRequired,
        headerTitle: PropTypes.string.isRequired,
        backFunction: PropTypes.func.isRequired,
        reportCardUUID: PropTypes.string.isRequired,
        approvalStatus_status: PropTypes.string.isRequired,
        reportFilters: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.state = {subjects: props.results, selectedFilterPicker: placeHolderPicker, allFilterItems: []};
    }

    viewName() {
        return 'ApprovalListingView';
    }

    componentDidMount() {
        if (this.props.indicatorActionName) {
            setTimeout(() => {
                this.dispatchAction(this.props.indicatorActionName, {loading: false});
                const options = this.getService(FormMappingService).getAllWithEnableApproval()
                    .map((fm) => ({label: fm.form.name, value: fm}));
                const optionsWithAll = [placeHolderPicker, ...options];
                this.setState({allFilterItems: optionsWithAll});
            }, 0);
        }
    }

    onFilterChange(filterItem) {
        const {reportCardUUID, reportFilters} = this.props;
        const rcUUID = this.getService(ReportCardService).getPlainUUIDFromCompositeReportCardUUID(reportCardUUID);
        const reportCard = this.getService(EntityService).findByUUID(rcUUID, ReportCard.schema.name);
        const subjects = this.getService(ReportCardService).getResultForApprovalCardsType(reportCard.standardReportCardType, reportFilters, filterItem.value);
        this.setState({subjects: subjects, formMapping: filterItem.value});
    }

    openFilterPicker(value) {
        this.setState({filterPickerOpened: value});
    }

    renderFilter() {
        const {allFilterItems, filterPickerOpened, formMapping, subjects} = this.state;

        return (
            <View style={styles.filterContainer}>
                <View>
                    <Text style={{color: Colors.DetailsTextColor}}>{`Total ${subjects.length} subjects`}</Text>
                </View>
                <View style={{marginTop: 10}}>
                    <DropDownPicker
                        itemKey={"label"}
                        items={allFilterItems}
                        open={filterPickerOpened}
                        setOpen={(value) => this.openFilterPicker(value)}
                        itemStyle={{justifyContent: 'flex-start'}}
                        placeholder={'Select type'}
                        dropDownStyle={{backgroundColor: '#fafafa'}}
                        arrowColor={Colors.DefaultPrimaryColor}
                        onSelectItem={this.onFilterChange.bind(this)}
                        value={formMapping}
                        customArrowUp={() => <Icon name={'caret-up'} size={18}/>}
                        customArrowDown={() => <Icon name={'caret-down'} size={18}/>}
                    />
                </View>
            </View>
        )
    }

    onBackPress() {
        this.props.backFunction();
    }

    render() {
        General.logDebug("ApprovalListingView", 'render');
        const title = this.props.headerTitle;
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t(title)} func={this.onBackPress.bind(this)}/>
                {this.renderFilter()}
                <FlatList
                    data={getUnderlyingRealmCollection(this.state.subjects)}
                    keyExtractor={(item) => item.uuid}
                    renderItem={(x) =>
                        <SubjectApprovalView subject={new Individual(x.item)} approvalStatus_status={this.props.approvalStatus_status}
                                             onApprovalSelection={(entity) => this.props.onApprovalSelection(this, entity)}/>}
                    initialNumToRender={50}
                    updateCellsBatchingPeriod={500}
                    maxToRenderPerBatch={20}
                />
            </CHSContainer>
        )
    }
}

const styles = StyleSheet.create({
    filterContainer: {
        marginHorizontal: 16,
        marginVertical: 20,
        flexDirection: 'column',
        alignItems: 'center'
    }
});

export default ApprovalListingView;
