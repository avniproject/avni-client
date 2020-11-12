import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import Colors from "../primitives/Colors";
import {SectionList, StyleSheet, Text, View} from "react-native";
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";
import React from "react";
import Distances from "../primitives/Distances";
import moment from "moment";
import _ from "lodash";


class NextScheduledVisitsForOtherSubjects extends AbstractComponent {
    static propTypes = {
        nextScheduledVisits: PropTypes.any.isRequired,
        // sectionSeparator: PropTypes.string,
        style: PropTypes.object,
        title: PropTypes.string
    };

    constructor(props, context) {
        super(props, context);
        this.createScheduledVisitStyles(props.highlight);
        // this.state = {sliceCount: 2};
    }

    createScheduledVisitStyles(highlight) {
        this.styles =
            {
                visitTable: {
                    marginHorizontal: 3,
                    backgroundColor: Colors.GreyContentBackground
                },
                visitRow: {borderRightWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
                visitColumn: {
                    borderLeftWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 3,
                    paddingBottom: 2,
                    textAlign: 'center',
                    flex: 1
                },
                container: {
                    flex: 1,
                    paddingTop: 30
                },
                tableHeaderRow: {
                    marginHorizontal: 3,
                    marginTop: 4,
                    flexDirection: "row",
                    borderBottomColor: Colors.InputBorderNormal,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    flexWrap: 'wrap',
                    backgroundColor: Colors.HighlightBackgroundColor
                },
                tableColHeader: {
                    borderLeftWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 3,
                    paddingBottom: 2,
                    textAlign: 'center',
                    fontSize: Fonts.Normal,
                    color: Styles.greyText,
                    fontWeight: 'bold',
                    paddingTop: 5
                }
            }
    }

    renderTitle() {
        if (this.props.title) return (<Text style={Fonts.Title}>{this.props.title}</Text>);
    }

    render() {
        // console.log(`nextScheduledVisits: ${JSON.stringify(util.inspect(this.props.nextScheduledVisits, {depth: 2}))}`);
        if (_.isEmpty(this.props.nextScheduledVisits)) return <View/>;

        const visitsBySubject = _.toArray(_.groupBy(this.props.nextScheduledVisits, 'subject.uuid')).map((value) => ({
            title: value[0].subject.name,
            data: value
        }));
        // console.log(`sections: ${JSON.stringify(util.inspect(visitsBySubject, {depth: 2}))}`);
        const dateFormat = "DD-MMM-YYYY";

        return (
            <View style={[{flexDirection: "column", paddingBottom: 10}, this.props.style]}>
                {this.renderTitle()}
                <SectionList
                    ListHeaderComponent={
                        <View style={[this.styles.tableHeaderRow]}>
                            <Text style={[this.styles.tableColHeader, {flex: 1.5,}]}>{this.I18n.t('visitName')}</Text>
                            <Text
                                style={[this.styles.tableColHeader, {flex: 1.5,}]}>{this.I18n.t('schedulingFor')}</Text>
                            <Text style={[this.styles.tableColHeader, {flex: 1.5,}]}>{this.I18n.t('overdueBy')}</Text>
                        </View>
                    }
                    contentContainerStyle={{
                        marginRight: Distances.ScaledContentDistanceFromEdge,
                        marginLeft: Distances.ScaledContentDistanceFromEdge,
                        marginTop: Distances.ScaledContentDistanceFromEdge
                    }}
                    // sections={visitsBySubject.slice(0, this.state.sliceCount)}
                    sections={visitsBySubject}
                    renderSectionHeader={({section: {title}}) =>
                        <Text style={[Fonts.typography("paperFontTitle"), {
                            color: "rgba(0, 0, 0, 0.87)",
                            fontWeight: 'normal',
                            fontSize: 15,
                            paddingTop: 15
                        }]}>{title}</Text>
                    }
                    renderItem={({item}) => {
                        return (
                            < View style={[{flexDirection: "row"}, this.styles.visitRow]}>
                                <Text style={[{
                                    textAlign: 'left',
                                    fontSize: Fonts.Normal,
                                    color: Styles.greyText
                                }, this.styles.visitColumn]}>{item.name}</Text>
                                <Text style={[{
                                    textAlign: 'left',
                                    fontSize: Fonts.Medium,
                                }, this.styles.visitColumn]}>{moment(item.earliestDate).format(dateFormat)}</Text>
                                <Text style={[{
                                    textAlign: 'left',
                                    fontSize: Fonts.Normal,
                                    color: Styles.greyText
                                }, this.styles.visitColumn]}>{moment(item.maxDate).format(dateFormat)}</Text>
                            </View>
                        );
                    }
                    }
                    keyExtractor={(item, index) => index}
                    // initialNumToRender={1}
                    // onEndReachedThreshold={0.2}
                    // onEndReached={() => this.setState({sliceCount: this.state.sliceCount + 1})}
                />

            </View>
        );
    }
}

export default NextScheduledVisitsForOtherSubjects;