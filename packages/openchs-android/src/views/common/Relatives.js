import {TouchableNativeFeedback, Text, View, StyleSheet} from "react-native";
import ListView from "deprecated-react-native-listview";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import {Button} from "native-base";
import SubjectInfoCard from "./SubjectInfoCard";

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
    }

    renderRelativeActionButton(individualRelative) {
        return <View style={{flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end'}}>
            <Button transparent
                    onPress={() => this.props.onRelativeDeletion(individualRelative)}
                    style={styles.buttonStyle}>
                <Text style={{fontSize: Fonts.Medium, color: Colors.ActionButtonColor}}>{this.I18n.t("delete")}</Text>
            </Button>
        </View>;
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
                (<View style={{flexDirection: "column", paddingBottom: 10, borderRadius: 10}}>
                    {this.renderTitle()}
                    <ListView enableEmptySections={true}
                              dataSource={dataSource}
                              renderRow={(relative) =>
                                  <TouchableNativeFeedback onPress={() => this.onResultRowPress(relative.relative)}
                                                           background={TouchableNativeFeedback.SelectableBackground()}>
                                      <View style={styles.container}>
                                          <View style={styles.relativeDetails}>
                                              <View style={{flex: 1, alignContent: 'flex-start'}}>
                                                  <Text
                                                      style={Styles.relativeRelationText}>{this.I18n.t(relative.relation.name)}</Text>
                                              </View>
                                          </View>
                                          <View style={{marginHorizontal: 10}}>
                                              <SubjectInfoCard individual={relative.relative}/>
                                          </View>
                                          {editDeleteFeatureToggle && this.renderRelativeActionButton(relative)}
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
        backgroundColor: Styles.greyBackground,
        marginVertical: 3,
        paddingBottom: 10,
        paddingTop: 5,
        borderRadius: 10
    },
    relativeDetails: {
        flexDirection: 'row',
        backgroundColor: Styles.greyBackground,
        flexWrap: 'nowrap',
        paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge,
        alignItems: 'center',
        alignSelf: 'center',
        flex: 1
    },
    buttonStyle: {
        backgroundColor: Styles.greyBackground,
        borderRadius: 5,
        elevation: 2,
        marginHorizontal: 5
    }
});
