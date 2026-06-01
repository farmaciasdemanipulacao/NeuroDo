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
  console.error('Could not resolve openai package.json via require.resolve:', e.message);
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

// If require.resolve failed, also inspect node_modules directly to ensure the package is present
try {
  const candidateDir = path.join(process.cwd(), 'node_modules', 'openai');
  if (fs.existsSync(candidateDir)) {
    console.log('node_modules/openai exists at:', candidateDir);
    try {
      const files = fs.readdirSync(candidateDir);
      console.log('node_modules/openai files:', files.join(', '));
    } catch (e) {
      console.error('Could not list node_modules/openai files:', e.message);
    }

    const candidatePkg = path.join(candidateDir, 'package.json');
    if (fs.existsSync(candidatePkg)) {
      try {
        console.log('node_modules/openai package.json content:');
        console.log(fs.readFileSync(candidatePkg, 'utf8'));
      } catch (e) {
        console.error('Failed reading node_modules/openai/package.json:', e.message);
      }
    } else {
      console.log('node_modules/openai/package.json not found at', candidatePkg);
    }

    const candidateSrc = path.join(candidateDir, 'src');
    if (fs.existsSync(candidateSrc)) {
      try {
        const srcFiles = fs.readdirSync(candidateSrc);
        console.log('node_modules/openai/src files:', srcFiles.join(', '));
        const tsconfigPath = path.join(candidateSrc, 'tsconfig.json');
        if (fs.existsSync(tsconfigPath)) {
            console.log('--- begin node_modules/openai/src/tsconfig.json ---');
            console.log(fs.readFileSync(tsconfigPath, 'utf8'));
            console.log('--- end node_modules/openai/src/tsconfig.json ---');

            // Attempt to rename the file to avoid TypeScript picking it up during build.
            try {
              const disabledPath = tsconfigPath + '.disabled-by-prebuild';
              fs.renameSync(tsconfigPath, disabledPath);
              console.log('Renamed openai src tsconfig to:', disabledPath);
            } catch (renameErr) {
              console.error('Failed to rename openai src tsconfig:', renameErr.message);
            }
        }
      } catch (e) {
        console.error('Could not inspect node_modules/openai/src:', e.message);
      }
    } else {
      console.log('node_modules/openai/src not present at', candidateSrc);
    }
  } else {
    console.log('node_modules/openai not found at', candidateDir);
  }
} catch (e) {
  console.error('Fallback inspection failed:', e.message);
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
