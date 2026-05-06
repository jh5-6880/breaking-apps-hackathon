#!/usr/bin/env python3
"""Push breaking_apps_hackathon_zh.md to Hashnode as a draft."""

import json
import re
import urllib.request

HASHNODE_TOKEN = "ef802642-44db-4930-b070-51873dcc1287"
PUBLICATION_ID = "69bce3b8b238fd45a36ad8ef"
BLOG_FILE = "breaking_apps_hackathon_zh.md"

with open(BLOG_FILE, "r") as f:
    content = f.read()

# Strip YAML frontmatter if present
body = re.sub(r"^---.*?---\n", "", content, flags=re.DOTALL)

TITLE = (
    "WildGuard 把「GFR 計算公式」判成危險內容：用 Passmark AI 破解三款醫療安全分類器"
)

mutation = """
mutation CreateDraft($input: CreateDraftInput!) {
  createDraft(input: $input) {
    draft {
      id
      title
      slug
    }
  }
}
"""

variables = {
    "input": {
        "title": TITLE,
        "contentMarkdown": body,
        "publicationId": PUBLICATION_ID,
        "tags": [
            {"slug": "ai", "name": "AI"},
            {"slug": "machinelearning", "name": "Machine Learning"},
            {"slug": "testing", "name": "Testing"},
        ],
    }
}

payload = json.dumps({"query": mutation, "variables": variables})

req = urllib.request.Request(
    "https://gql.hashnode.com/",
    data=payload.encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": HASHNODE_TOKEN,
    },
)
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())

print(json.dumps(result, ensure_ascii=False, indent=2))
if "errors" not in result:
    draft = result["data"]["createDraft"]["draft"]
    print(f"\n✓ Draft created: id={draft['id']}  slug={draft['slug']}")
