#!/bin/bash
if [ $# -lt 3 ]; then
    echo "!!!! To be used as part of make deploy_all_impls task !!"
    exit 1
fi
IMPLEMENTATION_NAME=$1
ZIP_FILE_URL=https://github.com/OpenCHS/$IMPLEMENTATION_NAME/archive/master.zip

echo "--------------------------"
echo "$IMPLEMENTATION_NAME"
echo "--------------------------"

echo "Fetching $ZIP_FILE_URL..."
curl -L $ZIP_FILE_URL -o /tmp/$IMPLEMENTATION_NAME.zip

echo "Extracting..."
unzip -q /tmp/$IMPLEMENTATION_NAME.zip -d /tmp/

echo "Deploying...."
cd /tmp/$IMPLEMENTATION_NAME-master && make server=$2 port=$3 token=$4 deploy_refdata

echo "Cleaning up...."
rm -rf /tmp/$IMPLEMENTATION_NAME*