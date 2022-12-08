#!/bin/bash
MSG=`cat $1`
if [[ $MSG != *"[buildskip]"* ]]; then
    echo "Building..."
    ./build.sh 
    git commit -am "[buildskip] Bump Version"
else
    echo "Skipping build..."
fi

# copy to .git/hooks/commit-msg
