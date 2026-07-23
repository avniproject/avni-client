import {Text, View} from "react-native";
import ListView from "deprecated-react-native-listview";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import moment from "moment";
import _ from "lodash";

class NextScheduledVisits extends AbstractComponent {
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
        // Figma shows this table as plain text with thin column dividers only - no shaded
        // header row, no cell borders, and teal-colored data values.
        this.styles =
            {
                visitTable: {},
                visitRow: {},
                visitColumn: {
                    paddingBottom: 2,
                    textAlign: 'left',
                    flex: 1
                },
                visitColumnDivider: {
                    borderLeftWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 8
                },
                container: {
                    flex: 1,
                    paddingTop: 30
                },
                tableHeaderRow: {
                    marginTop: 4,
                    flexDirection: "row",
                    flexWrap : 'wrap'
                },
                tableColHeader: {
                    paddingBottom: 6,
                    textAlign: 'left',
                    fontSize: Styles.smallTextSize,
                    color: Colors.TextPrimaryDark,
                    opacity: 0.7,
                    fontWeight: 'normal',
                    paddingTop:5
                }
            }
    }

    renderTitle() {
        if (this.props.title) return (<Text style={[Fonts.Title, {color: Colors.BrandPrimaryDark}]}>{this.props.title}</Text>);
    }

    render() {
        if (this.props.nextScheduledVisits.length === 0) return <View/>;

        const format = "DD-MMM-YYYY";
        const nextScheduledVisits = this.props.nextScheduledVisits.map(visit => [ !_.isEmpty(visit.name) ? this.I18n.t(visit.name) : this.I18n.t(visit.encounterType),
            moment(visit.earliestDate).format(format),
            moment(visit.maxDate).format(format) ]);

        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(nextScheduledVisits);
        return (
            <View style={[{flexDirection: "column", paddingBottom: 10}, this.props.style]}>
                {this.renderTitle()}
                < View style={[this.styles.tableHeaderRow]}>
                    <Text style={[this.styles.tableColHeader, {flex: 1.5,}]}>{this.I18n.t('visitName')}</Text>
                    <Text style={[this.styles.tableColHeader, this.styles.visitColumnDivider, {flex: 1.5,}]}>{this.I18n.t('schedulingFor')}</Text>
                    <Text style={[this.styles.tableColHeader, this.styles.visitColumnDivider, {flex: 1.5,}]}>{this.I18n.t('overdueBy')}</Text>
                </View>
                <ListView
                    enableEmptySections={true}
                    dataSource={dataSource}
                    style={this.styles.visitTable}
                    removeClippedSubviews={true}
                    renderRow={([visitName, scheduledFor, overdueBy]) =>
                        < View style={[{flexDirection: "row"}, this.styles.visitRow]}>
                            <Text style={[{
                                textAlign: 'left',
                                fontSize: Styles.smallTextSize,
                                color: Colors.BrandPrimary
                            }, this.styles.visitColumn]}>{visitName}</Text>
                            <Text style={[{
                                textAlign: 'left',
                                fontSize: Styles.smallTextSize,
                                color: Colors.BrandPrimary
                            }, this.styles.visitColumn, this.styles.visitColumnDivider]}>{scheduledFor}</Text>
                            <Text style={[{
                                textAlign: 'left',
                                fontSize: Styles.smallTextSize,
                                color: Colors.BrandPrimary
                            }, this.styles.visitColumn, this.styles.visitColumnDivider]}>{overdueBy}</Text>
                        </View>}
                />
            </View>
        );
    }
}

export default NextScheduledVisits;
