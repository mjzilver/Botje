/* eslint-disable no-console */
const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const extensions = [".js"]
const ignorePatterns = ["node_modules", "coverage", "dist", "build", "out", "test", "tests", ".git", ".vscode", ".idea"]

const fileMap = new Map()

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)

        if (ignorePatterns.some(pattern => full.includes(pattern)))
            continue

        if (entry.isDirectory()) {
            walk(full)
        } else {
            const rel = path.relative(ROOT, full)
            const noExt = rel.replace(path.extname(rel), "")
            const modulePath = noExt.replace(/\\/g, "/")
            fileMap.set(modulePath, full)
        }
    }
}
walk(ROOT)

for (const [modulePath, fullPath] of fileMap) {
    let warnings = 0
    const ext = path.extname(fullPath)
    if (extensions.includes(ext)) {
        console.log(`// File: ${modulePath}${ext}`)
        const content = fs.readFileSync(fullPath, "utf8")

        const updatedContent = content.replace(/require\(['"]([^'"]+)['"]\)/g, (match, p1) => {
            if (p1.startsWith(".") || p1.startsWith("/")) return match

            let targetPath = fileMap.get(p1)

            if (!targetPath) {
                const candidates = Array.from(fileMap.entries()).filter(([key]) => {
                    return (key === p1 || key.endsWith(p1) || key.endsWith(p1.replace(/\.js$/, "")))
                })

                if (candidates.length > 1) {
                    console.warn(`Ambiguous match for '${p1}' in ${modulePath}${ext}`)
                    console.warn(`Found candidates: ${candidates.map(c => c[0]).join(", ")}`)
                    warnings++
                    return match
                } else if (candidates.length === 1) {
                    targetPath = candidates[0][1]
                } else {
                    console.warn(`Could not resolve '${p1}' in ${modulePath}${ext}`)
                    warnings++
                    return match
                }
            }

            let relPath = path.relative(path.dirname(fullPath), targetPath)
            relPath = relPath.replace(/\\/g, "/").replace(/\.(js)$/, "")
            if (!relPath.startsWith(".")) relPath = `./${ relPath}`

            return `require("${relPath}")`
        })

        console.log(updatedContent)
        fs.writeFileSync(fullPath, updatedContent, "utf8")
        console.log(`Updated: ${modulePath}${ext} with ${warnings} warnings`)
    }
}
