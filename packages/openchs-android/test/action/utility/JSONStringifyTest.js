import {assert} from "chai";
import {JSONStringify} from "../../../src/utility/JsonStringify";

it('should stringify', function () {
        assert.equal(JSONStringify(undefined), undefined);
        assert.equal(JSONStringify(null), undefined);
        assert.equal("{}", JSONStringify({}));
        const obj = {
            name: "Sid",
            age: 29,
            engineer: true,
            expertise: ['html', 'css', 'react'],
            address: {
                city: 'New york',
                state: 'NY'
            }
        };
        assert.equal(JSONStringify(obj), JSON.stringify(obj));

        assert.equal(JSONStringify({a: [{b: [{c: 1}]}]}, 6), `{"a":[{"b":[{"c":1}]}]}`);
        assert.equal(JSONStringify({a: [1, 2, 3, 4, 5, 6]}, 4, 3), `{"a":[1,2,3,...]}`);

        const selfReferencing = {
            name: "Sid",
            friends: []
        };
        selfReferencing.friends.push(selfReferencing);
        selfReferencing["me"] = selfReferencing;
        assert.equal(JSONStringify(selfReferencing, 4), `{"name":"Sid","friends":[<object_repeated>],"me":<object_repeated>}`);
    }
);

it('should redact sensitive keys', function () {
    assert.equal(JSONStringify({userId: "u", password: "secret"}), `{"userId":"u","password":"<redacted>"}`);
    // covers camelCase, snake_case and plural token-shaped keys, case-insensitively
    assert.equal(JSONStringify({accessToken: "a", refresh_token: "r"}), `{"accessToken":"<redacted>","refresh_token":"<redacted>"}`);
    assert.equal(JSONStringify({tokens: "t", jwtToken: "j"}), `{"tokens":"<redacted>","jwtToken":"<redacted>"}`);
    // nested slices are redacted too
    assert.equal(JSONStringify({login: {userId: "u", password: "secret"}}), `{"login":{"userId":"u","password":"<redacted>"}}`);
    // only string values are redacted, so non-secret flags like showPassword stay visible
    assert.equal(JSONStringify({showPassword: true, password: "secret"}), `{"showPassword":true,"password":"<redacted>"}`);
});
