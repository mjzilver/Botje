import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { format } from "sql-formatter";

const args = new Set(process.argv.slice(2));
const fixMode = args.has("--fix");
const root = process.cwd();
const srcRoot = path.join(root, "src");
const files = ts.sys.readDirectory(srcRoot, [".ts"], undefined, ["**/*.ts"]);

function addIssue(issues, filePath, sourceFile, node, kind, details) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const relPath = path.relative(root, filePath);
    const dedupeKey = `${relPath}:${line + 1}:${kind}:${details}`;
    if (issues.seen.has(dedupeKey)) {
        return;
    }

    issues.seen.add(dedupeKey);
    issues.push({
        filePath: relPath,
        line: line + 1,
        kind,
        details,
    });
}

function stripTrailingSemicolon(value) {
    return value.trim().replace(/;$/, "").trim();
}

function formatSql(sqlText) {
    return format(sqlText, {
        language: "postgresql",
        keywordCase: "upper",
        tabWidth: 4,
        linesBetweenQueries: 1,
    });
}

function normalizeSql(text) {
    return stripTrailingSemicolon(text)
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n");
}

function lintTaggedTemplate(filePath, sourceFile, node, issues, edits) {
    if (!ts.isIdentifier(node.tag) || node.tag.text !== "sqlText") {
        return;
    }

    if (!ts.isNoSubstitutionTemplateLiteral(node.template)) {
        addIssue(issues, filePath, sourceFile, node, "template", "sqlText templates must not contain expressions");
        return;
    }

    const sqlText = node.template.text;
    try {
        const formatted = stripTrailingSemicolon(formatSql(sqlText)).split("\n").map((line) => line.trimEnd());
        const starts = sourceFile.getLineStarts();
        const pos = node.getStart(sourceFile);
        const { line } = sourceFile.getLineAndCharacterOfPosition(pos);
        const linePrefix = sourceFile.text.slice(starts[line], pos);
        const indent = `${linePrefix.match(/^\s*/)?.[0] ?? ""}    `;
        const expectedSource = `sqlText\`\n${formatted.map((l) => `${indent}${l}`).join("\n")}\``;
        const currentSource = sourceFile.text.slice(pos, node.getEnd());
        const expectedSql = expectedSource.slice("sqlText`\n".length, -1);

        if (normalizeSql(sqlText) !== normalizeSql(expectedSql)) {
            addIssue(issues, filePath, sourceFile, node, "format", "sqlText template should match sql-formatter output");
        }

        if (fixMode && currentSource !== expectedSource) {
            edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: expectedSource });
        }
    } catch (_error) {
        addIssue(issues, filePath, sourceFile, node, "parse", "SQL could not be parsed by sql-formatter");
    }
}

function lintFile(filePath, issues) {
    const sourceText = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
    const edits = [];

    function visit(node) {
        if (ts.isTaggedTemplateExpression(node)) {
            lintTaggedTemplate(filePath, sourceFile, node, issues, edits);
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    if (fixMode && edits.length > 0) {
        const ordered = [...edits].sort((a, b) => b.start - a.start);
        let result = sourceText;
        for (const edit of ordered) {
            result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
        }
        if (result !== sourceText) {
            fs.writeFileSync(filePath, result, "utf8");
            return 1;
        }
    }

    return 0;
}

function runLintPass() {
    const issues = [];
    issues.seen = new Set();    
    let fixedFiles = 0;
    
    for (const filePath of files) {
        fixedFiles += lintFile(filePath, issues);
    }

    return { issues, fixedFiles };
}

let { issues, fixedFiles } = runLintPass();

if (fixMode && fixedFiles > 0) {
    console.log(`Applied SQL fixes in ${fixedFiles} file(s).`);

    ({ issues } = runLintPass());
}

if (issues.length === 0) {
    console.log("SQL lint passed: no issues found.");
    process.exit(0);
}

for (const issue of issues) {
    console.log(`${issue.filePath}:${issue.line} [${issue.kind}] ${issue.details}`);
}

console.log(`\nSQL lint found ${issues.length} issue(s).`);
process.exit(1);
