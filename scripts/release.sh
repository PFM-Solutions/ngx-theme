#!/bin/sh
set -eu

# Runs on every push to main without a pending changeset: once the version is tagged, there is nothing left to do.
version=$(node -p "require('./package.json').version")
if git ls-remote --exit-code --tags origin "refs/tags/v${version}" >/dev/null; then
  echo "v${version} is already tagged, nothing to release."
  exit 0
fi

npm run build:lib
npm stage publish --access public
# Writes the new tag to $CHANGESETS_OUTPUT: the Changesets action then pushes it and creates the GitHub release.
npx changeset git-tag
