#!/usr/bin/env bash
# Prints the release notes (markdown) for the commits in <from>..<to>, grouped by
# the conventional commit type of each subject.
#
# Usage: .github/scripts/release-notes.sh <from-ref> <to-ref>
#
# Squash merges make every PR one commit on main whose subject is the PR title
# as it was when merged (with " (#123)" appended), so the notes read like the
# PR list but can't be changed by retitling a PR afterwards. The PR title check
# (.github/workflows/pr-title.yml) keeps the subjects in "type(area): text" form.
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
done < <(git log --no-merges --format=%s "${from}..${to}")

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
