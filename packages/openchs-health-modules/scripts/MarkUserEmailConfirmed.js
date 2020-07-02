const AWS = require('aws-sdk');

const auth = {
    region: process.argv[2],
    accessKeyId: process.argv[3],
    secretAccessKey: process.argv[4],
};

var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider(auth);

const filterUserAttributes = (attributes) => {
    const allAttributes = attributes.map(({Name}) => Name);
    return attributes.filter(({Name, Value}) => (Name === 'email_verified' && Value === 'false') ||
        (Name === 'phone_number_verified' && Value === 'false') ||
        !allAttributes.includes('phone_number_verified') ||
        !allAttributes.includes('email_verified')).length !== 0;
};

const updateAttributes = (poolId, paginationToken) => {
    var params = {
        UserPoolId: poolId,
        PaginationToken: paginationToken
    };
    cognitoidentityserviceprovider.listUsers(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        } else {
            const token = data.PaginationToken;
            const nonConfirmedUsers = data.Users.filter(user => filterUserAttributes(user.Attributes));
            if (nonConfirmedUsers.length === 0) {
                console.log("no non confirmed users found");
            } else {
                nonConfirmedUsers && nonConfirmedUsers.forEach(user => {
                    const updatedParams = {
                        UserAttributes: [
                            {
                                Name: 'email_verified',
                                Value: 'true'
                            },
                            {
                                Name: 'phone_number_verified',
                                Value: 'true'
                            }
                        ],
                        UserPoolId: poolId,
                        Username: user.Username
                    };
                    cognitoidentityserviceprovider.adminUpdateUserAttributes(updatedParams, function (err, data) {
                        if (err) {
                            console.log(err, err.stack);
                        } else {
                            console.log(`Attributes updated for user : ${user.Username}`);
                        }
                    });
                })
            }
            if (token) {
                updateAttributes(poolId, token);
            }
        }
    });
};


if (process.argv[2] === '' || process.argv[2] === undefined) {
    console.log("Usage: node MarkUserEmailConfirmed.js <region> <accessKeyId> <secretAccessKey> <poolId> ");
} else {
    updateAttributes(process.argv[5]);
}
