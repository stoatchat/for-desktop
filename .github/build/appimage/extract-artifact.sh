#!/bin/sh

set -eu

echo "Extracting Artifact..."
echo "---------------------------------------------------------------"

mkdir -p ./AppDir/bin
unzip /tmp/stoat/Stoat-linux-*.zip
mv -v ./Stoat-linux-"$BUILD_ARCH"/* ./AppDir/bin

echo "Packaging as version $BUILD_VERSION"
echo "$BUILD_VERSION" > ~/version