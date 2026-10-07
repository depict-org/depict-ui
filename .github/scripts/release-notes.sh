#!/usr/bin/env bash
# Prints the release notes (markdown) for the commits in <from>..<to>, grouped by
# the conventional commit type of each subject.
#
# Usage: .github/scripts/release-notes.sh <from-ref> <to-ref>
#
# Squash merges make every PR one commit on main, with " (#123)" appended to
# its subject. The notes use those subjects, so retitling a PR after the merge
# can't change them. The subject is the PR title (checked by
# .github/workflows/pr-title.yml) when the repo's "default squash commit title"
# setting is "pull request title"; with "commit or pull request title" a
# single-commit PR uses its commit headline instead.
#
#   feat                                   -> New features
#   fix, revert                            -> Fixes
#   perf                                   -> Performance
#   refactor, docs, style, build, other    -> Other changes
#   chore, ci, test                        -> left out (housekeeping, release bumps)
set -euo pipefail

from="${1:?usage: release-notes.sh <from-ref> <to-ref>}"
to="${2:?usage: release-notes.sh <from-ref> <to-ref>}"

features=()
fixes=()
performance=()
other=()

# --no-merges below: a merge-commit merge only wraps the PR's own commits, which are listed themselves
pattern='^(feat|fix|perf|refactor|revert|docs|style|test|build|ci|chore)(\([^()]+\))?(!)?: (.+)$'
# Read the log up front so a failing git log (bad range, missing tag) aborts
# instead of looking like a release with no changes
subjects=$(git log --no-merges --format=%s "${from}..${to}")
while IFS= read -r subject; do
  [ -n "${subject}" ] || continue
  type=""
  breaking=""
  if [[ "${subject}" =~ ${pattern} ]]; then
    type="${BASH_REMATCH[1]}"
    breaking="${BASH_REMATCH[3]}"
  fi
  line="- ${subject}"
  if [ -n "${breaking}" ]; then
    line="- **Breaking:** ${subject}"
  fi

  case "${type}" in
    feat) features+=("${line}") ;;
    fix | revert) fixes+=("${line}") ;;
    perf) performance+=("${line}") ;;
    chore | ci | test) ;;
    *) other+=("${line}") ;;
  esac
done <<< "${subjects}"

section() {
  local title="$1"
  shift
  [ "$#" -gt 0 ] || return 0
  printf '## %s\n\n' "${title}"
  printf '%s\n' "$@"
  printf '\n'
}

section "New features" ${features[@]+"${features[@]}"}
section "Fixes" ${fixes[@]+"${fixes[@]}"}
section "Performance" ${performance[@]+"${performance[@]}"}
section "Other changes" ${other[@]+"${other[@]}"}
if [ "${#features[@]}" -eq 0 ] && [ "${#fixes[@]}" -eq 0 ] && [ "${#performance[@]}" -eq 0 ] && [ "${#other[@]}" -eq 0 ]; then
  printf 'Maintenance release with no user-facing changes.\n\n'
fi
