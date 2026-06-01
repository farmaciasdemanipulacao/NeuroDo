#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function safeExec(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim();
  } catch (e) {
    return String(e).trim();
  }
}

console.log('=== openai diagnostics (prebuild) ===');
console.log('CWD:', process.cwd());
console.log('Node:', process.version);
console.log('NPM:', safeExec('npm --version'));
try {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  console.log('Project next:', (rootPkg.dependencies && rootPkg.dependencies.next) || (rootPkg.devDependencies && rootPkg.devDependencies.next) || 'unknown');
} catch (e) {
  console.error('Could not read project package.json:', e.message);
}

let openaiPkgPath = null;
try {
  openaiPkgPath = require.resolve('openai/package.json');
  console.log('openai package.json resolved at:', openaiPkgPath);
  const openaiPkg = JSON.parse(fs.readFileSync(openaiPkgPath, 'utf8'));
  console.log('openai version:', openaiPkg.version || 'unknown');
} catch (e) {
  console.error('Could not resolve openai package.json:', e.message);
}

if (openaiPkgPath) {
  const openaiDir = path.dirname(openaiPkgPath);
  const tsconfigPath = path.join(openaiDir, 'src', 'tsconfig.json');
  try {
    if (fs.existsSync(tsconfigPath)) {
      console.log('Found openai src tsconfig at:', tsconfigPath);
      console.log('--- begin openai/src/tsconfig.json ---');
      console.log(fs.readFileSync(tsconfigPath, 'utf8'));
      console.log('--- end openai/src/tsconfig.json ---');
    } else {
      console.log('openai/src/tsconfig.json not found at expected path:', tsconfigPath);
    }
  } catch (e) {
    console.error('Error reading openai tsconfig:', e.message);
  }

  try {
    const srcFiles = fs.readdirSync(path.join(openaiDir, 'src'));
    console.log('openai/src files:', srcFiles.join(', '));
  } catch (e) {
    console.error('Could not list openai/src:', e.message);
  }
}

// root tsconfig info
try {
  const rootTs = path.join(process.cwd(), 'tsconfig.json');
  if (fs.existsSync(rootTs)) {
    console.log('Root tsconfig.json content:');
    console.log(fs.readFileSync(rootTs, 'utf8'));
  } else {
    console.log('No root tsconfig.json found at', rootTs);
  }
} catch (e) {
  console.error('Failed reading root tsconfig:', e.message);
}

console.log('=== end diagnostics ===');

process.exit(0);
