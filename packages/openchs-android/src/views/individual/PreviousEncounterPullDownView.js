import {View} from 'react-native';
import PropTypes from 'prop-types';
import React from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import IndividualProfile from '../common/IndividualProfile';
import Colors from '../primitives/Colors';
import Fonts from '../primitives/Fonts';
import Distances from '../primitives/Distances';
import {Button, IconButton} from 'native-base';
import PreviousEncounters from '../common/PreviousEncounters';
import Separator from '../primitives/Separator';
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import Styles from '../primitives/Styles';
import General from '../../utility/General';
import {Form} from 'avni-models';
import AvniIcon from '../common/AvniIcon';

class PreviousEncounterPullDownView extends AbstractComponent {
    static propTypes = {
        individual: PropTypes.object.isRequired,
        encounters: PropTypes.any,
        showExpanded: PropTypes.bool.isRequired,
        actionName: PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.toggleExpandCollapse = this.toggleExpandCollapse.bind(this);
    }

    viewName() {
        return 'PreviousEncounterPullDownView';
    }

    toggleExpandCollapse() {
        this.dispatchAction(this.props.actionName);
    };

    getCollapsedView() {
        return (
            <View style={{flexDirection: 'column'}}>
                <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard}
                                   individual={this.props.individual}
                                   textColor={Colors.DefaultPrimaryColor}
                                   style={{
                                       backgroundColor: Colors.GreyContentBackground,
                                       paddingHorizontal: Distances.ContentDistanceFromEdge
                                   }}/>
                <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                    <IconButton
                            icon={<AvniIcon color={'#212121'}  style={{fontSize: Fonts.Large}} name='arrow-downward' type='MaterialIcons'/>}
                            style={{
                                position: 'absolute',
                                bottom: -10,
                                width: 96,
                                height: 36,
                                backgroundColor: Colors.SecondaryActionButtonColor,
                                borderRadius: 18
                            }}
                            onPress={this.toggleExpandCollapse}/>
                </View>
            </View>
        );
    }

    getExpandedView() {
        return (
            <View style={{flexDirection: 'column'}}>
                <View style={{
                    backgroundColor: Colors.GreyContentBackground,
                    paddingHorizontal: Distances.ScaledContentDistanceFromEdge
                }}>
                    <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard}
                                       individual={this.props.individual} textColor={Colors.TextOnPrimaryColor}/>
                    <Separator style={{marginTop: DynamicGlobalStyles.resizeHeight(16)}}/>
                </View>
                <PreviousEncounters encounters={this.props.encounters}
                                    formType={Form.formTypes.Encounter}
                                    style={{
                                        paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                                        backgroundColor: Colors.GreyContentBackground,
                                        paddingBottom: DynamicGlobalStyles.resizeHeight(25)
                                    }} onShowMore={() => {
                }} showPartial={false}/>

                <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                    <Button secondary
                            rightIcon={<AvniIcon color={'#212121'} name='arrow-upward' type='MaterialIcons'/>}
                            style={{
                                position: 'absolute',
                                bottom: -10,
                                width: 96,
                                backgroundColor: Colors.SecondaryActionButtonColor,
                            }}
                            _text={{fontSize: Fonts.Normal, color: Styles.greyText}}
                            onPress={this.toggleExpandCollapse}/>
                </View>
            </View>
        );
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return this.props.showExpanded ? this.getExpandedView() : this.getCollapsedView();
    }
}

export default PreviousEncounterPullDownView;
