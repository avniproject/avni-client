import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import Colors from "../primitives/Colors";
import {SectionList, StyleSheet, Text, View} from "react-native";
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";
import React from "react";
import moment from "moment";
import _ from "lodash";


class NextScheduledVisitsForOtherSubjects extends AbstractComponent {
    static propTypes = {
        nextScheduledVisits: PropTypes.any.isRequired,
        style: PropTypes.object,
        title: PropTypes.string
    };

    constructor(props, context) {
        super(props, context);
        this.createScheduledVisitStyles(props.highlight);
    }

    createScheduledVisitStyles(highlight) {
        this.styles =
            {
                visitTable: {
                    marginHorizontal: 3,
                    backgroundColor: Colors.GreyContentBackground
                },
                visitRow: {marginRight: 3, borderRightWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
                visitColumn: {
                    borderLeftWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 3,
                    paddingRight: 3,
                    paddingBottom: 2,
                    textAlign: 'center',
                    flex: 1,
                    marginHorizontal: 3
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
                tableFooterRow: {
                    marginHorizontal: 3,
                    marginBottom: 4,
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
                },
                tableSectionHeader: {
                    marginHorizontal: 3,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 3,
                    paddingTop: 2,
                    paddingBottom: 2,
                    textAlign: 'center',
                    fontSize: Fonts.Normal,
                    color: Styles.greyText,
                    fontWeight: 'bold',
                    backgroundColor: Colors.GreyBackground
                }
            }
    }

    renderTitle() {
        if (this.props.title) return (<Text style={Fonts.Title}>{this.props.title}</Text>);
    }

    render() {
        if (_.isEmpty(this.props.nextScheduledVisits)) return <View/>;

        const visitsBySubject = _.sortBy(_.toArray(_.groupBy(this.props.nextScheduledVisits, 'subject.uuid')).map((value) => ({
            title: value[0].subject.nameString,
            data: value
        })), (visit) => visit.title.toLowerCase());
        const dateFormat = "DD-MMM-YYYY";

        return (
            <View style={[{flexDirection: "column", paddingBottom: 10}, /*this.styles.visitTable,*/ this.props.style]}>
                {this.renderTitle()}
                <SectionList
                    ListHeaderComponent={
                        <View style={[this.styles.tableHeaderRow]}>
                            <Text style={[this.styles.tableColHeader, {flex: 1.5,}]}>{this.I18n.t('visitName')}</Text>
                            <Text style={[this.styles.tableColHeader, {flex: 1.5,}]}>{this.I18n.t('schedulingFor')}</Text>
                            <Text style={[this.styles.tableColHeader, {flex: 1.5,}]}>{this.I18n.t('overdueBy')}</Text>
                        </View>
                    }
                    sections={visitsBySubject}
                    renderSectionHeader={({section: {title}}) =>
                        <Text style={[this.styles.tableSectionHeader]}>{title}</Text>
                    }
                    ListFooterComponent={<View style={this.styles.tableFooterRow} />}
                    stickySectionHeadersEnabled={true}
                    renderItem={({item}) => {
                        return (
                            <View style={[{flexDirection: "row"}, this.styles.visitRow]}>
                                <Text style={[{
                                    textAlign: 'left',
                                    fontSize: Fonts.Normal,
                                    color: Styles.greyText
                                }, this.styles.visitColumn]}>{item.name}</Text>
                                <Text style={[{
                                    textAlign: 'left',
                                    fontSize: Fonts.Normal,
                                }, this.styles.visitColumn]}>{moment(item.earliestDate).format(dateFormat)}</Text>
                                <Text style={[{
                                    textAlign: 'left',
                                    fontSize: Fonts.Normal,
                                    color: Styles.greyText,
                                }, this.styles.visitColumn]}>{moment(item.maxDate).format(dateFormat)}</Text>
                            </View>
                        );
                    }
                    }
                    keyExtractor={(item, index) => index}
                />
            </View>
        );
    }
}

export default NextScheduledVisitsForOtherSubjects;