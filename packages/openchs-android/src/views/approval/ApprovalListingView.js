import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import General from "../../utility/General";
import {SafeAreaView, SectionList, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import CHSContent from "../common/CHSContent";
import React from "react";
import ApprovalDetailsCard from "./ApprovalDetailsCard";

@Path('/approvalListingView')
class ApprovalListingView extends AbstractComponent {
    static propTypes = {
        results: PropTypes.array.isRequired,
        onApprovalSelection: PropTypes.func.isRequired,
        headerTitle: PropTypes.string.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return 'ApprovalListingView';
    }

    componentWillMount() {
        super.componentWillMount();
    }

    componentDidMount() {
        if (this.props.indicatorActionName) {
            setTimeout(() => this.dispatchAction(this.props.indicatorActionName, {loading: false}), 0);
        }
    }

    renderItem(item, section, onApprovalSelection) {
        const entity = item;
        const schema = section.title;
        return (
            <TouchableNativeFeedback key={entity.uuid}
                                     onPress={() => onApprovalSelection(this, item, schema)}
                                     background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={styles.cardContainer}>
                    <ApprovalDetailsCard entity={entity}/>
                </View>
            </TouchableNativeFeedback>
        )
    }

    renderFilter(title) {
        const total = _.map(this.props.results, ({data}) => data.length).reduce((total, l) => total + l, 0);
        return (
            <View style={styles.filterContainer}>
                <Text>{`Showing ${total} ${title} requests`}</Text>
            </View>
        )
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const title = this.props.headerTitle;
        const onApprovalSelection = this.props.onApprovalSelection;
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t(title)}/>
                {this.renderFilter(this.I18n.t(title))}
                <CHSContent>
                    <SafeAreaView style={styles.container}>
                        <SectionList
                            sections={this.props.results}
                            keyExtractor={(item, index) => item.individual.uuid + index}
                            renderItem={({item, section}) => this.renderItem(item, section, onApprovalSelection)}
                        />
                    </SafeAreaView>
                </CHSContent>
            </CHSContainer>
        )
    }

}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16
    },
    cardContainer: {
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
        marginVertical: 5,
        paddingBottom: 5,
        borderRadius: 5,
    },
    filterContainer: {
        marginHorizontal: 16,
        marginVertical: 20
    }
});


export default ApprovalListingView;
