import {TouchableNativeFeedback, ListView, Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import {Icon, Button} from "native-base";
class Relatives extends AbstractComponent {
    static propTypes = {
        relatives: React.PropTypes.array.isRequired,
        style: React.PropTypes.object,
        title: React.PropTypes.string,
        highlight: React.PropTypes.bool,
        onRelativeSelection: React.PropTypes.func.isRequired,
        onRelativeDeletion: React.PropTypes.func.isRequired
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
                      paddingHorizontal:4,
                      backgroundColor: program.colour,
                      color: Colors.TextOnPrimaryColor,
                      textAlignVertical: 'center'
                  }, Styles.userProfileProgramTitle]}>{this.I18n.t(program.displayName)}</Text>
        );
    }

    renderRelativeActionButton(individualRelative) {
        return (<View>
        <View style={{flex:0.125, alignItems: 'flex-start', justifyContent: 'flex-start'}}>
    <Button transparent textStyle={{fontSize: Fonts.Medium, color: Colors.ActionButtonColor,
            paddingHorizontal: 5}} onPress={() => this.props.onRelativeDeletion(individualRelative)}>delete</Button>

    </View>
        </View>);

    }

    render() {
        const editDeleteFeatureToggle = true;
        //TODO there is lot of duplication between this and ISRV but there are differences as well.Fix it.
        if (this.props.relatives.length === 0) return <View/>;
        const i18n = this.I18n;
         const relatives = this.props.relatives;
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(relatives);
        return (
            <View style={{flexDirection: "column", paddingBottom: 10}}>
                {this.renderTitle()}
                <ListView enableEmptySections={true}
                          dataSource={dataSource}
                          style={{backgroundColor: Styles.greyBackground}}
                          renderRow={(relative) =>
                              <TouchableNativeFeedback onPress={() => this.onResultRowPress(relative.relative)}
                                                       background={TouchableNativeFeedback.SelectableBackground()}>
                                  <View>
                                      <View style={{ flexDirection: 'row', flexWrap: 'nowrap',
                                          paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge, alignItems: 'center',
                                          alignSelf: 'center', flex:1}}>
                                          <View style={{flex:0.75}}>
                                              <Text style={Styles.relativeRelationText}>{i18n.t(relative.relation.name)}</Text>
                                          </View>
                                          {editDeleteFeatureToggle ? this.renderRelativeActionButton(relative) : <View/>}
                                      </View>
                                      <View style={{ flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center',
                                          alignSelf: 'center', height: 86, paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge}}>
                                          <Icon name='person-pin' style={{color: Colors.AccentColor, fontSize: 56, paddingRight: 16}}/>
                                          <View style={{ flexDirection: 'column', alignItems: 'flex-start', flex: 1}}>
                                              <Text style={Styles.textStyle}>{relative.relative.name}</Text>
                                              <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start'}}>
                                                  <Text style={Styles.userProfileSubtext}>{this.I18n.t(relative.relative.gender.name)}</Text>
                                                  <Text style={Styles.userProfileSubtext}>{relative.relative.getDisplayAge(i18n)}</Text>
                                              </View>
                                          </View>
                                          <View style={{
                                              flexDirection: 'column',
                                              justifyContent: 'center',
                                              alignItems: 'flex-end',
                                              flex: 1
                                          }}>
                                              <View style={{justifyContent: 'flex-end'}}>
                                                  <Text style={Styles.textStyle}>{this.I18n.t(relative.relative.lowestAddressLevel.name)}</Text>
                                              </View>
                                              <View style={{ flexDirection: 'row', justifyContent: 'flex-end'}}>
                                                  {_.filter(relative.relative.nonVoidedEnrolments(), (enrolment) => enrolment.isActive).map((enrolment, index) => this.renderProgram(enrolment.program, index))}
                                              </View>
                                          </View>
                                      </View>
                                      <View style={{borderBottomColor: Colors.GreyBackground, borderBottomWidth: 1,}}/>
                                  </View>
                              </TouchableNativeFeedback>
                          }>

                </ListView>
            </View>
        );
    }
}

export default Relatives;