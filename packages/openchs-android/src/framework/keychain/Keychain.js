import * as Keychain from 'react-native-keychain';
import base64 from 'base-64';
import {randomBytes} from "react-native-randombytes";

const CREDENTIAL_USERNAME = "avni-user";

async function getKey() {
    try {
        const credentials = await Keychain.getGenericPassword();
        let key;
        let encodedKey = null;
        if (credentials && credentials.username === CREDENTIAL_USERNAME) {
            let rawDecodedString = base64.decode(credentials.password);
            key = stringToByteArray(rawDecodedString);
        } else {
            console.log("Creating new credentials for ", CREDENTIAL_USERNAME);
            let rawBuffer = randomBytes(64);
            key = Uint8Array.from(rawBuffer); //Getting a Buffer here
            encodedKey = rawBuffer.toString('base64');
            await Keychain.setGenericPassword(CREDENTIAL_USERNAME,  encodedKey);
        }
        //console.log("Key is", Buffer.from(key).toString('hex')); //Needed for realm file decryption
        return key;
    } catch (error) {
        console.log("Keychain couldn't be accessed!", error);
        throw error;
    }
}

function stringToByteArray(s){
    var result = new Uint8Array(s.length);
    for (var i=0; i<s.length; i++){
        result[i] = s.charCodeAt(i);
    }
    return result;
}

export default getKey
