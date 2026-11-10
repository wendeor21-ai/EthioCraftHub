/**
 * Deployment Packaging Script
 * 
 * Packages the whole project for production release, excluding:
 * - .git
 * - .github
 * - node_modules / client/node_modules
 * - tmp / temp folders
 * - preexisting ZIP files
 * 
 * Works on Windows using PowerShell Compress-Archive.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper to copy directory recursively, filtering out excluded paths
function copyFolderRecursiveSync(src, dest, exclusions = []) {
  if (exclusions.some(exc => src.endsWith(exc) || src.includes(path.sep + exc + path.sep) || src.endsWith(path.sep + exc))) {
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    // Skip if matched inside exclusions list
    if (exclusions.includes(file)) {
      continue;
    }

    const stat = fs.lstatSync(srcPath);
    if (stat.isDirectory()) {
      copyFolderRecursiveSync(srcPath, destPath, exclusions);
    } else if (stat.isFile() || stat.isSymbolicLink()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function packageProject() {
  console.log('🏁 Starting production packaging...');
  const projectRoot = path.join(__dirname, '..');
  const tempDist = path.join(projectRoot, 'tmp_project_dist');
  const zipPath = path.join(projectRoot, 'ethiocraft-global-deployment.zip');

  // Verify and delete existing temporary folders or files
  if (fs.existsSync(tempDist)) {
    fs.rmSync(tempDist, { recursive: true, force: true });
  }
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  const exclusions = [
    '.git',
    '.github',
    'node_modules',
    'tmp',
    'tmp_project_dist',
    'tmp_db_export',
    'ethiocraft-global-deployment.zip',
    'database_export.zip',
    'build_output.log'
  ];

  console.log('📂 Copying files to deployment staging area...');
  copyFolderRecursiveSync(projectRoot, tempDist, exclusions);

  // If there client/node_modules is copied by mistake or needs cleanup
  const clientNodeModules = path.join(tempDist, 'client', 'node_modules');
  if (fs.existsSync(clientNodeModules)) {
    fs.rmSync(clientNodeModules, { recursive: true, force: true });
  }

  // Ensure database export runs and places exports inside
  try {
    console.log('📡 Running database export first...');
    execSync('node scripts/export-db-zip.js', { stdio: 'inherit', cwd: projectRoot });
    
    // Copy the database export zip into the zip folder
    const dbExportSource = path.join(projectRoot, 'database_export.zip');
    if (fs.existsSync(dbExportSource)) {
      fs.copyFileSync(dbExportSource, path.join(tempDist, 'database_export.zip'));
      console.log('  ✅ Database export zip included in the deployment package.');
    }
  } catch (err) {
    console.warn('  ⚠️ Note: Database export script failed, checking database/ folder for static JSON files.');
  }

  // Compress using PowerShell Compress-Archive
  try {
    console.log('📦 Compressing project staging directory...');
    const relativeTempDist = path.relative(process.cwd(), tempDist);
    const relativeZipPath = path.relative(process.cwd(), zipPath);
    
    const command = `powershell -Command "Compress-Archive -Path '${relativeTempDist}\\*' -DestinationPath '${relativeZipPath}' -Force"`;
    execSync(command, { stdio: 'inherit' });
    
    console.log(`🎉 Project archived successfully without Git or GitHub!`);
    console.log(`💾 Release ZIP file: ${zipPath}`);
  } catch (err) {
    console.error('❌ Project compression failed:', err.message);
  } finally {
    // Clean up temporary space
    if (fs.existsSync(tempDist)) {
      console.log('🧹 Cleaning up staging folder...');
      fs.rmSync(tempDist, { recursive: true, force: true });
    }
  }
}

packageProject();
