import React from 'react';
import {View} from "react-native";
import {Text} from "native-base";
import _ from 'lodash';
import Fonts from "../primitives/Fonts";

const styles = {
    container: {
        flexDirection: "column",
        paddingBottom: 10
    },
    content: {
        borderColor: 'rgba(0, 0, 0, 0.12)',
        backgroundColor: 'rgba(209,209,209,0.05)',
        borderWidth: 1,
        paddingHorizontal: 3,
        paddingVertical: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    }
};

const GroupAffiliationInformation = ({individual, I18n}) => {
    return _.isEmpty(_.filter(individual.affiliatedGroups, ({voided, memberSubject}) => voided || !voided && _.isNil(memberSubject))) ?
        <View/> : (
            <View style={styles.container}>
                <Text style={[Fonts.Title, {opacity: 0.7}]}>{I18n.t("groupInformation")}</Text>
                <View style={styles.content}>
                    {_.map(individual.affiliatedGroups, ({voided, groupSubject, memberSubject}) => {
                        const groupInformation = {
                            memberName: individual.nameString,
                            groupSubjectTypeName: groupSubject.subjectTypeName,
                            groupSubjectName: groupSubject.nameString
                        };
                        if (!voided && _.isNil(memberSubject)) {
                            return <View style={styles.row}>
                                <Text style={{fontSize: 20}}>{'\u2022 '}</Text>
                                <Text>{I18n.t('groupAdditionMessage', groupInformation)}</Text>
                            </View>
                        }
                        if (voided) {
                            return <View style={styles.row}>
                                <Text style={{fontSize: 20}}>{'\u2022 '}</Text>
                                <Text>{I18n.t('groupRemovalMessage', groupInformation)}</Text>
                            </View>
                        }
                    })}
                </View>
            </View>
        )
};

export default GroupAffiliationInformation;
