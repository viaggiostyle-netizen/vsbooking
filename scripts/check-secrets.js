const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const IGNORED_DIRS = ["node_modules", ".git", ".firebase", ".next", "backups", "out"]
const ALLOWED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".json", ".env", ".md", ".yml", ".yaml", ".txt"])
const PATTERNS = [
  /-----BEGIN PRIVATE KEY-----/,
  /-----BEGIN CERTIFICATE-----/,
  /-----BEGIN RSA PRIVATE KEY-----/,
  /\bSUPABASE_SERVICE_ROLE_KEY\b/,
  /\bNEXTAUTH_SECRET\b/,
  /\bFIREBASE_PRIVATE_KEY\b/,
  /\bGOOGLE_CLIENT_SECRET\b/,
  /\bGOOGLE_CLIENT_ID\b/,
  /\bNEXT_PUBLIC_SUPABASE_ANON_KEY\b/,
]

const results = []

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  const lines = content.split(/\r?\n/)
  lines.forEach((line, index) => {
    PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        results.push({ filePath, line: index + 1, text: line.trim() })
      }
    })
  })
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const resolved = path.join(dir, entry.name)
    if (IGNORED_DIRS.includes(entry.name)) continue
    if (entry.isDirectory()) {
      walk(resolved)
    } else if (entry.isFile()) {
      scanFile(resolved)
    }
  }
}

walk(ROOT)

if (results.length > 0) {
  console.error("\n[check-secrets] Found potential secret references:")
  results.forEach(({ filePath, line, text }) => {
    console.error(`${filePath}:${line}: ${text}`)
  })
  console.error("\n[check-secrets] Please remove sensitive values from source files and use environment variables or secrets manager.")
  process.exit(1)
}

console.log("[check-secrets] No suspicious secret patterns found.")
process.exit(0)
