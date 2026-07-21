#!/usr/bin/env node
/**
 * Doubao ImageGen — Claude Code skill wrapper
 * 
 * Usage: node index.js "<prompt>"
 * 
 * This is a thin wrapper that calls the main doubao-image.js script
 * from the AgentChat project root.
 */

const path = require('path');
const { execSync } = require('child_process');

const prompt = process.argv[2];
if (!prompt) {
    console.error('❌ 用法: node index.js "提示词"');
    process.exit(1);
}

const scriptPath = path.join(__dirname, '..', '..', 'doubao-image.js');
const projectRoot = path.join(__dirname, '..', '..');

console.log(`🎨 豆包生图: "${prompt}"`);
console.log('⏳ 正在生成（约40-50秒）...');

try {
    const output = execSync(`node "${scriptPath}" "${prompt.replace(/"/g, '\"')}"`, {
        cwd: projectRoot,
        timeout: 120000,
        stdio: 'pipe',
        encoding: 'utf-8'
    });
    console.log(output);
    
    // Show output files
    const fs = require('fs');
    const outputDir = path.join(projectRoot, 'doubao-outputs');
    if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir)
            .filter(f => f.startsWith('doubao'))
            .sort();
        if (files.length > 0) {
            console.log(`\n📁 输出目录: ${outputDir}`);
            for (const f of files) {
                const stat = fs.statSync(path.join(outputDir, f));
                console.log(`   ${f} (${(stat.size / 1024).toFixed(0)}KB)`);
            }
        }
    }
} catch (err) {
    console.error('❌ 生图失败:', err.message);
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(1);
}
