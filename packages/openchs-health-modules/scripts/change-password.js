var Cognito = require('amazon-cognito-identity-js');
global.navigator = () => null;

var changePassword = function (poolId, clientId, username, password, newPassword) {
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
            console.log("Authenticated");
            cognitoUser.changePassword(password, newPassword, function(err, result) {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log('change password: ' + result);
            });
        },
        onFailure: function (error) {
            console.log("Check Credentials. " + "PoolId=" + poolId + " ClientId=" + clientId + " Username=" + username + " Password=" + password);
        }
    });

};

if (process.argv[2] === '' || process.argv[2] === undefined) {
    console.log("Usage: node change-password.js <poolId> <appClientId> <username> <oldPassword> <newPassword>");
} else {
    changePassword(process.argv[2], process.argv[3], process.argv[4], process.argv[5], process.argv[6]);
}