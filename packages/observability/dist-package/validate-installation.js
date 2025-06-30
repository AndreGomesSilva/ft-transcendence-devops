#!/usr/bin/env node

console.log('🔍 Validating @ft-transcendence/observability installation...\n');

try {
    // Test requiring the package
    const observability = require('./dist/index.js');

    if (typeof observability.setupObservability === 'function') {
        console.log('✅ setupObservability function found');
    } else {
        console.log('❌ setupObservability function not found');
        process.exit(1);
    }

    if (typeof observability.setupObservabilityLegacy === 'function') {
        console.log('✅ setupObservabilityLegacy function found');
    } else {
        console.log('❌ setupObservabilityLegacy function not found');
        process.exit(1);
    }

    // Check if types are available
    const fs = require('fs');
    if (fs.existsSync('./dist/index.d.ts')) {
        console.log('✅ TypeScript definitions found');
    } else {
        console.log('❌ TypeScript definitions not found');
        process.exit(1);
    }

    console.log('\n🎉 Package validation successful!');
    console.log('The observability library is ready to use.');

} catch (error) {
    console.log('❌ Package validation failed:', error.message);
    process.exit(1);
}
