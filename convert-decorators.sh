#!/bin/bash

# Decorator Conversion Script Runner
# Converts @Action, @Service, @Path decorators for React Native 0.81.4 compatibility

echo "🚀 Running Decorator Conversion Script..."
echo "This will convert all decorators to function calls for Hermes parser compatibility"
echo ""

# Ensure we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from the root directory of avni-client project"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js not found. Please install Node.js"
    exit 1
fi

# Run the conversion script
node scripts/convert-decorators.js

echo ""
echo "🔧 To test the conversion:"
echo "   make clean_all deps build_app flavor=generic"
echo ""
echo "🔄 To restore from backup if needed:"
echo "   cp -r decorator-conversion-backup/src packages/openchs-android/"
