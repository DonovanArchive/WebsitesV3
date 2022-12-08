#!/usr/bin/env bash
VERSION=$(npm --no-git-tag-version --tag-version-prefix="" version patch)
git add -A

docker build . -t registry.local/websites:latest -t registry.local/websites:$VERSION
docker build src/imgen -t registry.local/imgen:latest -t registry.local/imgen:$VERSION
docker push -a registry.local/websites
docker push -a registry.local/imgen
