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
