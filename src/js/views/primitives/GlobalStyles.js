import {StyleSheet} from 'react-native';
import Colors from '../primitives/Colors';

export let Global = StyleSheet.create({
    mainSection: {
        marginHorizontal: 5,
        marginTop: 15
    },
    navButtonHidden: {
        height: 0
    },
    navButtonVisible: {
        height: 44
    },
    actionButtonWrapper: {
        backgroundColor: Colors.Complimentary,
        width: 110,
        height: 40,
        borderRadius: 5
    },
    actionButton: {
        color: '#ffffff',
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: 18,
        flex: 1
    },
    //<ListView>
    listViewContainer: {
        margin: 8,
        marginTop: 22,
        borderWidth: 2,
        borderRadius: 3,
        borderColor: Colors.TertiaryColor
    },
    listViewHeader: {
        fontSize: 20,
        backgroundColor: Colors.TertiaryColor,
        color: '#555555',
        textAlign: 'center'
    },
    listRow: {
        flex: 1,
        flexDirection: 'row',
        marginLeft: 5
    },
    listCellContainer: {
        flex: 0.33
    },
    listCell: {
        fontSize: 19,
        color: Colors.Complimentary,
        textAlign: 'center',
        flex: 0.33
    },
    listRowSeparator: {
        height: 2,
        backgroundColor: '#14e4d5'
    },
    emptyListPlaceholderText: {
        fontSize: 18,
        textAlign: 'center',
        color: Colors.Complimentary
    }
    //</ListView>
});