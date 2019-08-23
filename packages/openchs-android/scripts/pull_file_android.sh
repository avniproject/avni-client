#!/bin/bash
#
# Strict mode: http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail
IFS=$'\n\t'

# 
# Usage: script -f fileToPull -p packageName
# 

# This script is for pulling private files from an Android device
# using run-as. Note: not all devices have run-as access, and
# application must be a debug version for run-as to work.
# 
# If run-as is deactivated on your device use one of the
# alternative methods here:
# http://stackoverflow.com/questions/15558353/how-can-one-pull-the-private-data-of-ones-own-android-app
# 
# If you have encrypted backup files use:
# sourceforge.net/projects/adbextractor/files/?source=navbar 
# From comments in the accepted answer in the above SO question
# 
# If your files aren't encrypted use the accepted answer 
# ( see comments and other answers for OSX compatibility )
# 
# This script is open to expansions to allow selecting 
# device used. Currently first selected device from
# adb shell will be used.

#Check we have one connected device
adb devices -l | grep -e 'device\b' > /dev/null

if [ $? -gt 0 ]; then
    echo "No device connected to adb."
    exit 1
fi

# Set filename or directory to pull from device
# Set package name we will run as
while getopts f:p: opt; do
    case $opt in
        f)
            fileToPull=$OPTARG
            ;;
        p)
            packageName=$OPTARG
            ;;
    esac
done;

# Block file arg from being blank
if [ -z "$fileToPull" ]; then
    echo "Please specify file or folder to pull with -f argument"
    exit 1
fi

# Block package name arg from being blank
if [ -z "$packageName" ]; then
    echo "Please specify package name to run as when pulling file"
    exit 1
fi

# Check package exists
adb shell pm list packages | grep "$packageName" > /dev/null
if [ $? -gt 0 ]; then
    echo "Package name $packageName does not exist on device"
    exit 1
fi

# Check file exists and has permission with run-as
fileCheck=`adb shell "run-as $packageName ls $fileToPull"`
if [[ $fileCheck =~ "Permission denied" ]] || [[ $fileCheck =~ "No such file or directory" ]]; then
    echo "Error: $fileCheck"
    echo "With file -> $fileToPull"
    exit 1
fi

# Function to pull private file
#
# param 1 = package name
# param 2 = file to pull
# param 3 = output file
function pull_private_file () {

    mkdir -p `dirname $3`

    echo -e "\033[0;35m***" >&2
    echo -e "\033[0;36m Coping file $2 -> $3" >&2
    echo -e "\033[0;35m***\033[0m" >&2

    adb shell "run-as $1 cat $2" > $3
}

# Check if a file is a directory
# 
# param 1 = directory to check
function is_file_dir() {

    adb shell "if [ -d \"$1\" ]; then echo TRUE; fi"
}

# Check if a file is a symbolic link
# 
# param 1 = directory to check
function is_file_symlink() {

    adb shell "if [ -L \"$1\" ]; then echo TRUE; fi"
}

# recursively pull files from device connected to adb
# 
# param 1 = package name
# param 2 = file to pull
# param 3 = output file
function recurse_pull_private_files() {

    is_dir=`is_file_dir "$2"`
    is_symlink=`is_file_symlink "$2"`

    if [ -n "$is_dir" ]; then

        files=`adb shell "run-as $1 ls \"$2\""`

        # Handle the case where directory is a symbolic link
        if [ -n "$is_symlink" ]; then
            correctPath=`adb shell "run-as $1 ls -l \"$2\"" | sed 's/.*-> //' | tr -d '\r'`
            files=`adb shell "run-as $1 ls \"$correctPath\""`
        fi

        for i in $files; do

            # Android adds nasty carriage return that screws with bash vars
            # This removes it. Otherwise weird behavior happens
            fileName=`echo "$i" | tr -d '\r'` 

            nextFile="$2/$fileName"
            nextOutput="$3/$fileName"
            recurse_pull_private_files "$1" "$nextFile" "$nextOutput"
        done
    else

        pull_private_file "$1" "$2" "$3"
    fi
}

recurse_pull_private_files "$packageName" "$fileToPull" "`basename "$fileToPull"`"