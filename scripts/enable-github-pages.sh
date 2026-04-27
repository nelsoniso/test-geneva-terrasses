#!/usr/bin/env bash
# Active Pages (GitHub Actions) + permissions workflow — nécessite gh login ou GITHUB_TOKEN.
# Dépôt public requis pour le plan GitHub gratuit (Pages indisponible pour les dépôts privés).
set -euo pipefail
REPO="${1:-nelsoniso/geneve-ombres-sitg}"
OWNER="${REPO%%/*}"
NAME="${REPO#*/}"

github_curl() {
  local method=$1 path=$2 data=$3
  curl -sS -X "$method" \
    -H "Authorization: Bearer ${TOK}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com${path}" \
    ${data:+-d "$data"}
}

ensure_pages_gh() {
  local default_branch body http
  default_branch="$(gh api "repos/${REPO}" --jq .default_branch)"

  if gh api "repos/${REPO}/pages" &>/dev/null; then
    echo "→ Pages existe déjà : passage en build GitHub Actions (workflow)"
    gh api --method PUT "repos/${REPO}/pages" --input - <<< '{"build_type":"workflow"}'
  else
    echo "→ Création du site Pages (workflow, branche ${default_branch})"
    body="$(printf '{"build_type":"workflow","source":{"branch":"%s","path":"/"}}' "${default_branch}")"
    set +e
    out="$(gh api --method POST "repos/${REPO}/pages" --input - <<<"${body}" 2>&1)"
    code=$?
    set -e
    if [[ $code -ne 0 ]]; then
      if [[ "$out" == *"does not support GitHub Pages"* ]] || [[ "$out" == *"422"* ]]; then
        echo "$out" >&2
        echo "" >&2
        echo "Sur le plan gratuit, GitHub Pages ne s’applique pas aux dépôts privés." >&2
        echo "Utilise un dépôt public, par exemple :" >&2
        echo "  ./scripts/enable-github-pages.sh nelsoniso/test-geneva-terrasses" >&2
        exit 1
      fi
      echo "$out" >&2
      exit "$code"
    fi
  fi

  gh api --method PUT "repos/${REPO}/actions/permissions/workflow" \
    -f default_workflow_permissions=write 2>/dev/null || true
}

ensure_pages_token() {
  local default_branch body sc
  default_branch="$(curl -sS -H "Authorization: Bearer ${TOK}" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO}" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("default_branch","main"))')"

  sc=$(curl -sS -o /tmp/gh_pages_get.json -w "%{http_code}" \
    -H "Authorization: Bearer ${TOK}" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO}/pages")
  if [[ "$sc" == "200" ]]; then
    github_curl PUT "/repos/${REPO}/pages" '{"build_type":"workflow"}'
    echo
  else
    body="$(printf '{"build_type":"workflow","source":{"branch":"%s","path":"/"}}' "${default_branch}")"
    github_curl POST "/repos/${REPO}/pages" "$body"
    echo
  fi
  github_curl PUT "/repos/${REPO}/actions/permissions/workflow" '{"default_workflow_permissions":"write"}' || true
  echo
}

echo "→ Configuration pour ${REPO}"
if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  ensure_pages_gh
elif [[ -n "${GITHUB_TOKEN:-}${GH_TOKEN:-}" ]]; then
  TOK="${GITHUB_TOKEN:-$GH_TOKEN}"
  ensure_pages_token
else
  echo "Installe et connecte GitHub CLI :" >&2
  echo "  brew install gh && gh auth login" >&2
  echo "Ou exporte un token : export GITHUB_TOKEN=ghp_..." >&2
  exit 1
fi

echo "→ OK. Ajoute le workflow Pages sur ce dépôt, pousse sur main, ou Actions → Run workflow."
echo "   URL attendue : https://${OWNER}.github.io/${NAME}/"
