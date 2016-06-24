import React, { StyleSheet } from 'react-native';

export let Global = StyleSheet.create({
    navButton: {
        backgroundColor: '#FF3823',
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
    actionButton: {
        backgroundColor: '#1D3557',
        color: '#FFFFFF',
        margin: 2,
        width: 175,
        height: 50,
        textAlign: 'center',
        textAlignVertical: 'center',
        fontWeight: 'bold',
        fontSize: 20
    },
    mainSection: {
        marginTop: 15,
        paddingLeft: 10,
        paddingRight: 10
    }
});
