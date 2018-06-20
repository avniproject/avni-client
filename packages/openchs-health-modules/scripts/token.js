var Cognito = require('amazon-cognito-identity-js');
global.navigator = () => null;

var authenticate = function (poolId, clientId, username, password) {
    var authenticationDetails = new Cognito.AuthenticationDetails({
        Username: username,
        Password: password
    });
    var userPool = new Cognito.CognitoUserPool({
        UserPoolId: poolId,
        ClientId: clientId
    });
    var cognitoUser = new Cognito.CognitoUser({Username: username, Pool: userPool});
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            console.log(result.getIdToken().getJwtToken());
        },
        onFailure: function (error) {
            console.log("Check Credentials. " + "PoolId=" + poolId + " ClientId=" + clientId + " Username=" + username + " Password=" + password);
        },
        newPasswordRequired: function (userAttributes, requiredAttributes) {
            cognitoUser.completeNewPasswordChallenge(password, userAttributes, this);
        }
    })
};

if (process.argv[2] === '' || process.argv[2] == undefined) {
    console.log("Usage: node token.js <poolId> <clientId> <username> <password>");
} else {
    authenticate(process.argv[2], process.argv[3], process.argv[4], process.argv[5]);
}
