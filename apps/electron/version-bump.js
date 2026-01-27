#!/usr/bin/env node

/**
 * Version bump script for Voiden
 *
 * Usage:
 *   node version-bump.js <channel> <bump-type>
 *
 * Examples:
 *   node version-bump.js beta patch       # 0.10.8 -> 0.10.9-beta.1
 *   node version-bump.js beta prerelease  # 0.10.9-beta.1 -> 0.10.9-beta.2
 *   node version-bump.js stable patch     # 0.10.9-beta.5 -> 0.10.9
 *   node version-bump.js stable minor     # 0.10.9 -> 0.11.0
 *   node version-bump.js stable major     # 0.11.0 -> 1.0.0
 */

const fs = require("fs");
const path = require("path");
const semver = require("semver");

// Parse arguments
const channel = process.argv[2]; // 'beta' or 'stable'
const bumpType = process.argv[3]; // 'patch', 'minor', 'major', 'prerelease'

if (!channel || !['beta', 'stable'].includes(channel)) {
  console.error("❌ Error: Please specify channel as 'beta' or 'stable'");
  console.log("\nUsage: node version-bump.js <channel> <bump-type>");
  console.log("Example: node version-bump.js beta patch");
  process.exit(1);
}

if (!bumpType || !['patch', 'minor', 'major', 'prerelease'].includes(bumpType)) {
  console.error("❌ Error: Please specify bump type as 'patch', 'minor', 'major', or 'prerelease'");
  console.log("\nUsage: node version-bump.js <channel> <bump-type>");
  console.log("Example: node version-bump.js beta patch");
  process.exit(1);
}

// Read current version
const packageJsonPath = path.resolve(__dirname, "./package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const currentVersion = packageJson.version;

console.log(`\n🔢 Version Bump`);
console.log(`   Channel: ${channel}`);
console.log(`   Current version: ${currentVersion}`);
console.log(`   Bump type: ${bumpType}\n`);

// Calculate new version
let newVersion;
if (channel === 'beta') {
  if (bumpType === 'prerelease') {
    // Increment prerelease: 0.10.9-beta.1 -> 0.10.9-beta.2
    newVersion = semver.inc(currentVersion, 'prerelease', 'beta');
  } else {
    // New beta version: 0.10.8 -> 0.10.9-beta.1
    const baseVersion = semver.inc(currentVersion, bumpType);
    newVersion = `${baseVersion}-beta.1`;
  }
} else {
  // Stable release
  if (currentVersion.includes('-beta')) {
    // Promoting from beta to stable: remove -beta suffix
    newVersion = currentVersion.split('-')[0];
  } else {
    // Normal stable bump
    newVersion = semver.inc(currentVersion, bumpType);
  }
}

console.log(`✨ New version will be: ${newVersion}\n`);

// Confirm with user
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question(`Continue with version bump ${currentVersion} -> ${newVersion}? (y/n): `, (answer) => {
  readline.close();

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log("❌ Aborted by user");
    process.exit(0);
  }

  try {
    // Update version in package.json
    console.log(`\n📝 Updating version to ${newVersion}...`);
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Version updated in package.json`);

    console.log(`\n🎉 Version bump complete!`);
    console.log(`   Old version: ${currentVersion}`);
    console.log(`   New version: ${newVersion}`);
    console.log(`   Channel: ${channel}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   - Run publish for each platform:`);
    console.log(`     yarn workspace voiden publish:${channel}`);
    console.log(`   - Or use the release script to publish all platforms:`);
    console.log(`     yarn workspace voiden release:${channel}\n`);

  } catch (error) {
    console.error(`\n❌ Error during version bump:`, error.message);
    process.exit(1);
  }
});
