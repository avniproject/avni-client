import {ListView, StyleSheet, Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Separator from "../primitives/Separator";
import moment from "moment";

class NextScheduledVisits extends AbstractComponent {
    static propTypes = {
        nextScheduledVisits: React.PropTypes.any.isRequired,
        style: React.PropTypes.object,
        title: React.PropTypes.string
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
                    height: 30,
                    backgroundColor: Colors.GreyContentBackground
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
                    paddingTop:5
                }
            }
    }

    renderTitle() {
        if (this.props.title) return (<Text style={Fonts.Title}>{this.props.title}</Text>);
    }

    render() {
        if (this.props.nextScheduledVisits.length === 0) return <View/>;

        const format = "DD-MMM-YYYY";
        const nextScheduledVisits = this.props.nextScheduledVisits.map(visit => [ visit.name || visit.encounterType,
            moment(visit.earliestDate).format(format),
            moment(visit.maxDate).format(format) ]);

        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(nextScheduledVisits);
        return (
            <View style={[{flexDirection: "column", paddingBottom: 10}, this.props.style]}>
                {this.renderTitle()}
                < View style={[this.styles.tableHeaderRow]}>
                    <Text style={[this.styles.tableColHeader, {flex: 1.5,}]}>{this.I18n.t('visitName')}</Text>
                    <Text style={[this.styles.tableColHeader, {flex: 1.5,}]}>{this.I18n.t('schedulingFor')}</Text>
                    <Text style={[this.styles.tableColHeader, {flex: 1.5,}]}>{this.I18n.t('overdueBy')}</Text>
                </View>
                <ListView
                    enableEmptySections={true}
                    dataSource={dataSource}
                    style={this.styles.visitTable}
                    removeClippedSubviews={true}
                    renderSeparator={(ig, idx) => (<Separator key={idx} height={1}/>)}
                    renderRow={([visitName, scheduledFor, overdueBy]) =>
                        < View style={[{flexDirection: "row"}, this.styles.visitRow]}>
                            <Text style={[{
                                textAlign: 'left',
                                fontSize: Fonts.Normal,
                                color: Styles.greyText
                            }, this.styles.visitColumn]}>{visitName}</Text>
                            <Text style={[{
                                textAlign: 'left',
                                fontSize: Fonts.Medium,
                            }, this.styles.visitColumn]}>{scheduledFor}</Text>
                            <Text style={[{
                                textAlign: 'left',
                                fontSize: Fonts.Normal,
                                color: Styles.greyText
                            }, this.styles.visitColumn]}>{overdueBy}</Text>
                        </View>}
                />
            </View>
        );
    }
}

export default NextScheduledVisits;