from os import listdir
from os.path import isfile, join
import sys
import json


def validate(path):
    try:
        json.load(open(path))
    except ValueError:
        print "INVALID JSON: {}".format(path)


def validate_json(path):
    map(lambda x: validate(join(path, x)), [f for f in listdir(path) if f.endswith(".json")])


if __name__ == "__main__":
    validate_json(sys.argv[1])
