import PropTypes from 'prop-types';
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import DGS from "../primitives/DynamicGlobalStyles";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
import Styles from "../primitives/Styles";


class SearchResultsHeader extends AbstractComponent {
    static propTypes = {
        totalCount: PropTypes.number.isRequired,
        displayedCount: PropTypes.number.isRequired,
        displayResultCounts: PropTypes.bool,
    };

    static SearchResultsLimit = 50;

    static styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderWidth: 1,
            marginBottom: 3,
            borderStyle: 'solid',
            borderColor: Colors.InputBorderNormal,
            paddingVertical: DGS.resizeHeight(15),
            paddingLeft: Distances.ScaledContainerHorizontalDistanceFromEdge,
            paddingRight: DGS.resizeWidth(3)
        },
    });

    render() {
        const {totalCount, displayedCount} = this.props;
        const displayResultCounts = (totalCount > SearchResultsHeader.SearchResultsLimit) || this.props.displayResultCounts;
        return (
            <View style={SearchResultsHeader.styles.container}>
                <Text>
                    <Text style={{fontSize: 12, color: Styles.lightgrey}}>{totalCount}</Text>
                    <Text style={{fontSize: 12, color: Styles.lightgrey}}>{` ${this.I18n.t("matchingResults")}`}</Text>
                </Text>
                {displayResultCounts &&
                    <Text>
                        <Text style={{fontSize: 12, color: Styles.lightgrey}}>{`${this.I18n.t("displayed")}: `}</Text>
                        <Text style={{fontSize: 12, color: Styles.lightgrey}}>{displayedCount}</Text>
                    </Text>
                }
            </View>
        );
    }
}

export default SearchResultsHeader;
