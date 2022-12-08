#!/bin/bash
# .git/hooks/commit-msg
MSG=`cat $1`
if [[ $MSG != *"[buildskip]"* ]]; then
    echo "Building..."
    ./build.sh || exit 1 "build failed"
else
    echo "Skipping build..."
fi

#/bin/bash
# .git/hooks/post-commit
git update-index --refresh 
if git diff-index --quiet HEAD --; then
  git add -A
  git commit -am "[buildskip] Bump Version"
fi
