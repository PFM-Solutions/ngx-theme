#!/bin/sh
set -eu

# One-time bootstrap, run by a maintainer from the repo root: npm cannot attach a trusted publisher to a package
# that does not exist yet, so this publishes an empty placeholder, then configures the trusted publisher.
# Every real version goes through CI afterwards (see README, "First publish").
#
# Usage: sh scripts/bootstrap-npm.sh [--dry-run]
#   --dry-run  checks the prerequisites and runs `npm publish --dry-run`; deprecate and trust are skipped.

dry_run=false
case "${1-}" in
  '') ;;
  --dry-run) dry_run=true ;;
  *) echo "Usage: sh scripts/bootstrap-npm.sh [--dry-run]" >&2; exit 2 ;;
esac

min_npm=11.15.0
trust_repo=PFM-Solutions/ngx-theme
trust_workflow=release.yml
placeholder_version=0.0.0-bootstrap

name=$(node -p "require('./package.json').name")

npm_version=$(npm --version)
oldest=$(printf '%s\n%s\n' "$min_npm" "$npm_version" | sort -V | head -n 1)
if [ "$oldest" != "$min_npm" ]; then
  echo "npm ${npm_version} is too old: \`npm trust\` and \`npm stage\` need npm >= ${min_npm}." >&2
  echo "Run: npm install --global npm@^${min_npm}" >&2
  exit 1
fi

# Any failure other than a 404 (network, auth) must not be mistaken for "package absent".
if view_output=$(npm view "$name" version 2>&1); then
  echo "${name} already exists on the registry (${view_output}): nothing to bootstrap." >&2
  exit 1
fi
if ! printf '%s\n' "$view_output" | grep -q 'E404'; then
  echo "Could not tell whether ${name} exists:" >&2
  printf '%s\n' "$view_output" >&2
  exit 1
fi

placeholder_dir=$(mktemp -d)
trap 'rm -rf "$placeholder_dir"' EXIT

PLACEHOLDER_DIR=$placeholder_dir PLACEHOLDER_VERSION=$placeholder_version node -e '
  const { writeFileSync } = require("node:fs");
  const { join } = require("node:path");
  const { name, license, repository } = require("./package.json");
  const manifest = {
    name,
    version: process.env.PLACEHOLDER_VERSION,
    description: "Placeholder published once to enable npm trusted publishing. Do not use.",
    license,
    repository,
  };
  const dir = process.env.PLACEHOLDER_DIR;
  writeFileSync(join(dir, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(dir, "README.md"), `# ${name}\n\nPlaceholder, do not use. See the repository for the real releases.\n`);
'

echo "Publishing the placeholder ${name}@${placeholder_version} (npm will ask for 2FA)..."
if [ "$dry_run" = true ]; then
  npm publish "$placeholder_dir" --access public --tag bootstrap --dry-run
  echo "Dry run done: nothing was published, deprecated or configured."
  exit 0
fi
npm publish "$placeholder_dir" --access public --tag bootstrap

# A new package takes a few minutes to become visible: deprecate and trust return E404 until then.
echo "Waiting for the registry to serve ${name}@${placeholder_version}..."
attempts=0
until npm view "${name}@${placeholder_version}" version >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 60 ]; then
    echo "${name}@${placeholder_version} is still not visible after 30 minutes: finish with 'npm deprecate' and 'npm trust' by hand." >&2
    exit 1
  fi
  sleep 30
done

npm deprecate "${name}@${placeholder_version}" "Placeholder published to enable trusted publishing. Install a released version instead."

echo
# The registry may also point 'latest' at the first version of a new package, whatever --tag says.
echo "Dist-tags after the first publish (a 'latest' pointing at ${placeholder_version} is expected, 0.1.0 replaces it):"
npm dist-tag ls "$name"

echo
echo "Configuring the trusted publisher (${trust_repo}, ${trust_workflow}, \`npm stage publish\` only)..."
npm trust github "$name" --repo "$trust_repo" --file "$trust_workflow" --allow-stage-publish

cat <<EOF

Done. Next steps:
  1. Merge the "Version packages" PR within 2 days: the configuration expires if no publish validates it by then.
     The Release workflow stages 0.1.0.
  2. Approve the staged version on npmjs.com (package > Staged Packages) or:
       npm stage list ${name}
       npm stage approve <stage-id>
  3. Once 0.1.0 is approved, remove the stale 'bootstrap' tag (check with 'npm dist-tag ls ${name}'):
       npm dist-tag rm ${name} bootstrap
EOF
