import {StyleSheet} from 'react-native';
import Colors from '../primitives/Colors';

export let Global = StyleSheet.create({
    navButtonHidden: {
        height: 0
    },
    navButtonVisible: {
        height: 44
    },
    actionButtonWrapper: {
        backgroundColor: Colors.Complimentary,
        margin: 2,
        width: 125,
        height: 40,
        flex: 1,
        borderRadius: 5
    },
    actionButton: {
        color: '#ffffff',
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: 18,
        flex: 1
    },
    mainSection: {
        marginTop: 15,
        paddingLeft: 10,
        paddingRight: 10
    }
});