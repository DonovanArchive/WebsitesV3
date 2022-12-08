#!/bin/bash
MSG=`cat $1`
if [[ $MSG != *"[buildskip]"* ]]; then
    echo "Building..."
    ./build.sh 
else
    echo "Skipping build..."
fi

# copy to .git/hooks/commit-msg
