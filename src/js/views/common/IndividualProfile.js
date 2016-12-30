import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, Button, Grid, Row, Col, Icon, Thumbnail} from "native-base";
import Individual from "../../models/Individual";
import moment from "moment";

class IndividualProfile extends AbstractComponent {
    static propTypes = {
        landingView: React.PropTypes.bool.isRequired,
        individual: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    getImage(individual){
        if (individual.gender.name === 'Male'){
            if (moment().diff(individual.dateOfBirth, 'years') > 30){
                return <Thumbnail size={75} style={{borderWidth: 2, borderColor: '#ffffff', margin : 28}}
                                  source={require("../../../../android/app/src/main/res/mipmap-mdpi/narendra_modi.png")}/>
            }
            else {
                return <Thumbnail size={75} style={{borderWidth: 2, borderColor: '#ffffff', margin : 28}}
                                  source={require("../../../../android/app/src/main/res/mipmap-mdpi/arvind_kejriwal.jpg")}/>
            }
        }
        else if (individual.gender.name === 'Female'){
            return <Thumbnail size={75} style={{borderWidth: 2, borderColor: '#ffffff', margin : 28}}
                              source={require("../../../../android/app/src/main/res/mipmap-mdpi/mamta.jpg")}/>
        }
    }

    render() {
        return this.props.landingView ?
            (
                <Grid>
                    <Row style={{justifyContent: 'center', height: 131}}>
                        {this.getImage(this.props.individual)}
                    </Row>
                    <Row style={{justifyContent: 'center', height: 30}}><Text
                        style={{fontSize: 16, color: '#fff', justifyContent: 'center'}}>{this.props.individual.name}
                        | {this.props.individual.id}</Text></Row>
                    <Row style={{justifyContent: 'center', height: 30}}>
                        <Text style={{
                            textAlignVertical: 'top',
                            fontSize: 14,
                            color: '#fff',
                            justifyContent: 'center'
                        }}>{this.props.individual.gender.name}, {this.props.individual.getAge().toString()}
                            | {this.props.individual.lowestAddressLevel.title}
                        </Text>
                    </Row>
                    <Row style={{justifyContent: 'center', height: 40}}>
                        <Button bordered style={{marginLeft: 8, height: 26, justifyContent: 'center'}}><Icon
                            name="mode-edit"/>Edit Profile</Button>
                        <Button bordered style={{marginLeft: 8, height: 26, justifyContent: 'center'}}><Icon
                            name="add"/>Enroll Patient</Button>
                    </Row>
                </Grid>
            ) :
            (
                <Grid>
                    <Row style={{height: 24}}>
                        <Col><Text
                            style={{fontSize: 16}}>{this.props.individual.name}</Text></Col>
                        <Col style={{width: 100}}><Text
                            style={{fontSize: 16}}>{this.props.individual.lowestAddressLevel.title}</Text></Col>
                    </Row>
                    <Row style={{height: 24}}>
                        <Col><Text style={{fontSize: 14}}>
                            {this.props.individual.gender.name} | {this.props.individual.getAge().toString()}</Text></Col>
                        <Col style={{width: 100}}></Col>
                    </Row>
                </Grid>
            );

    }
}

export default IndividualProfile;