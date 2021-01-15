import PropTypes from 'prop-types';
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import DGS from "../primitives/DynamicGlobalStyles";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";


class SearchResultsHeader extends AbstractComponent {
    static propTypes = {
        totalCount: PropTypes.number.isRequired,
        displayedCount: PropTypes.number.isRequired,
        displayResultCounts: PropTypes.number,
    };

    static SearchResultsLimit = 50;

    static styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: Colors.InputBorderNormal,
            paddingVertical: DGS.resizeHeight(5),
            paddingLeft: Distances.ScaledContainerHorizontalDistanceFromEdge,
            paddingRight: DGS.resizeWidth(3)
        },
    });

    render() {
        const displayResultCounts = (this.props.totalCount > SearchResultsHeader.SearchResultsLimit) || this.props.displayResultCounts;
        return (
            <View style={SearchResultsHeader.styles.container}>
                <Text>
                    <Text style={{fontSize: 18, color: Colors.DefaultPrimaryColor}}>{`${this.I18n.t("totalMatchingResults")}: `}</Text>
                    <Text style={{fontSize: 18, color: Colors.DarkPrimaryColor}}>{this.props.totalCount}</Text>
                </Text>
                {displayResultCounts &&
                <Text>
                    <Text style={{fontSize: 18, color: Colors.DefaultPrimaryColor}}>{`${this.I18n.t("displayed")}: `}</Text>
                    <Text style={{fontSize: 18, color: Colors.DarkPrimaryColor}}>{this.props.displayedCount}</Text>
                </Text>
                }

            </View>
        );
    }
}

export default SearchResultsHeader;
