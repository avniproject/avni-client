#!/usr/bin/env bash

cp patches/react-native-0.42.3-source-map/source-map.js node_modules/react-native/packager/src/Bundler/source-map/source-map.js
cp patches/react-native-video-3.0.0/Video.js node_modules/react-native-video/Video.js
cp patches/react-native-video-player/VideoPlayer.js node_modules/react-native-video-player/index.js
