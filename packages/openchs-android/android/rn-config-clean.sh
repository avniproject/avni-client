#!/bin/bash
# Wrapper to run react-native config with clean npm config
npm --userconfig=/dev/null exec --quiet -- "$@"
