#!/usr/bin/env bash
# Active Pages (GitHub Actions) + permissions workflow — nécessite gh login ou GITHUB_TOKEN.
set -euo pipefail
REPO="${1:-nelsoniso/geneve-ombres-sitg}"

run() {
  if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
    gh api --method PUT "repos/${REPO}/pages" -f build_type=workflow
    gh api --method PUT "repos/${REPO}/actions/permissions/workflow" \
      -f default_workflow_permissions=write
    return 0
  fi
  if [[ -z "${GITHUB_TOKEN:-}" && -z "${GH_TOKEN:-}" ]]; then
    echo "Installe et connecte GitHub CLI :" >&2
    echo "  brew install gh && gh auth login" >&2
    echo "Ou exporte un token : export GITHUB_TOKEN=ghp_..." >&2
    exit 1
  fi
  TOK="${GITHUB_TOKEN:-$GH_TOKEN}"
  curl -sS -X PUT \
    -H "Authorization: Bearer ${TOK}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${REPO}/pages" \
    -d '{"build_type":"workflow"}'
  echo
  curl -sS -X PUT \
    -H "Authorization: Bearer ${TOK}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${REPO}/actions/permissions/workflow" \
    -d '{"default_workflow_permissions":"write"}'
  echo
}

echo "→ Configuration pour ${REPO}"
run
echo "→ OK. Lance un déploiement : Actions → Deploy to GitHub Pages → Run workflow"
echo "   URL : https://nelsoniso.github.io/geneve-ombres-sitg/"
