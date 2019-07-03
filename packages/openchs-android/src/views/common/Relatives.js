import {TouchableNativeFeedback, ListView, Text, View, StyleSheet} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import {Icon, Button} from "native-base";
import IndividualDetailsCard from "./IndividualDetailsCard";
import Distances from "../primitives/Distances";

class Relatives extends AbstractComponent {
    static propTypes = {
        relatives: PropTypes.array.isRequired,
        style: PropTypes.object,
        title: PropTypes.string,
        highlight: PropTypes.bool,
        onRelativeSelection: PropTypes.func.isRequired,
        onRelativeDeletion: PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.createObservationsStyles(props.highlight);
    }

    createObservationsStyles(highlight) {
        this.styles = highlight ?
            {
                observationTable: {
                    marginHorizontal: 3,
                    backgroundColor: Colors.HighlightBackgroundColor
                },
                observationRow: {borderRightWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
                observationColumn: {
                    borderLeftWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 3,
                    paddingBottom: 2,
                    flex: 1
                }
            }
            :
            {
                observationTable: {
                    marginHorizontal: 3,
                    backgroundColor: Colors.GreyContentBackground
                },
                observationRow: {borderRightWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
                observationColumn: {
                    borderLeftWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 3,
                    paddingBottom: 2,
                    flex: 1
                }
            }
    }

    renderTitle() {
        if (this.props.title) return (<Text style={Fonts.Title}>{this.props.title}</Text>);
    }

    onResultRowPress(individual) {
        this.props.onRelativeSelection(this, individual);
        // CHSNavigator.navigateToProgramEnrolmentDashboardView(this, individual.uuid);
    }

    renderProgram(program, index) {
        return (
            <Text key={index} disabled
                  style={[{
                      height: 22,
                      marginLeft: 4,
                      marginRight: 4,
                      borderRadius: 2,
                      paddingHorizontal: 4,
                      backgroundColor: program.colour,
                      color: Colors.TextOnPrimaryColor,
                      textAlignVertical: 'center'
                  }, Styles.userProfileProgramTitle]}>{this.I18n.t(program.displayName)}</Text>
        );
    }

    renderRelativeActionButton(individualRelative) {
        return (<View>
            <View style={{flex: 0.125, alignItems: 'flex-start', justifyContent: 'flex-start'}}>
                <Button transparent onPress={() => this.props.onRelativeDeletion(individualRelative)}><Text style={{
                    fontSize: Fonts.Medium, color: Colors.ActionButtonColor,
                    paddingHorizontal: 5
                }}>delete</Text></Button>

            </View>
        </View>);

    }

    renderNoRelativeMessage() {
        return <View style={[styles.container, {paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge}]}>
            <Text style={{
                fontSize: Fonts.Medium,
                color: Colors.DefaultPrimaryColor
            }}>{this.I18n.t("noRelativeAdded")}</Text>
        </View>
    }

    render() {
        const editDeleteFeatureToggle = true;
        const relatives = this.props.relatives;
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(relatives);
        return (
            relatives.length > 0 ?
                (<View style={{flexDirection: "column", paddingBottom: 10}}>
                    {this.renderTitle()}
                    <ListView enableEmptySections={true}
                              dataSource={dataSource}
                              renderRow={(relative) =>
                                  <TouchableNativeFeedback onPress={() => this.onResultRowPress(relative.relative)}
                                                           background={TouchableNativeFeedback.SelectableBackground()}>
                                      <View style={styles.container}>
                                          <View style={styles.relativeDetails}>
                                              <View style={{flex: 0.75}}>
                                                  <Text
                                                      style={Styles.relativeRelationText}>{this.I18n.t(relative.relation.name)}</Text>
                                              </View>
                                              {editDeleteFeatureToggle ? this.renderRelativeActionButton(relative) :
                                                  <View/>}
                                          </View>
                                          <IndividualDetailsCard individual={relative.relative} minHeight={10} iconSize={30}/>
                                      </View>
                                  </TouchableNativeFeedback>
                              }>

                    </ListView>
                </View>)
                : this.renderNoRelativeMessage()
        );
    }
}

export default Relatives;


const styles = StyleSheet.create({
    container: {
        margin: 4,
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
        marginVertical: 3,
        paddingBottom: 5,
    },
    relativeDetails: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge,
        alignItems: 'center',
        alignSelf: 'center',
        flex: 1
    }
});
