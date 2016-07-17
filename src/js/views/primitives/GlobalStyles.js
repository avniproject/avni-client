import {StyleSheet} from 'react-native';

export let Global = StyleSheet.create({
    navButton: {
        backgroundColor: '#f39c12',
        color: '#FFFFFF',
        margin: 2,
        width: 165,
        textAlign: 'center',
        textAlignVertical: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: 22
    },
    navButtonHidden: {
        height: 0
    },
    navButtonVisible: {
        height: 44
    },
    actionButtonWrapper: {
        backgroundColor: '#e93a2c',
        margin: 2,
        width: 175,
        height: 50,
        flex: 1,
        borderRadius: 5
    },
    actionButton: {
        color: '#FFFFFF',
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: 20,
        flex: 1
    },
    mainSection: {
        marginTop: 15,
        paddingLeft: 10,
        paddingRight: 10
    }
});
