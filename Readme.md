# Avni Client

React Native Android app for the [Avni](https://avni.readme.io/) field data collection platform.

[![License](https://img.shields.io/badge/license-AGPL-green.svg?style=flat)](LICENSE)

## Prerequisites

- A Linux or macOS shell — the build is Make + bash. **On Windows, use WSL2**:
  follow the step-by-step guide in [docs/dev-setup-windows-wsl2.md](docs/dev-setup-windows-wsl2.md).
- Node 20 via [nvm](https://github.com/nvm-sh/nvm) (version pinned in `.nvmrc`)
- Java 17
- Android SDK: platform 35, build-tools 35.0.0, NDK 27.1.12297006
- An Android device or emulator visible to `adb`
- Access to an Avni server with an implementation deployed (its URL goes in `dev.json` below)

## Quickstart

```bash
git clone https://github.com/avniproject/avni-client.git
cd avni-client

nvm install     # Node version from .nvmrc
make deps       # npm install + patches + prebuild
make test       # optional: verify unit tests pass

cp packages/openchs-android/config/env/dev.json.template packages/openchs-android/config/env/dev.json
# edit dev.json and set SERVER_URL to your Avni server
```

Then in two terminals:

```bash
make run_packager   # terminal 1 — Metro bundler
make run-app        # terminal 2 — build, install & launch on the connected device
```

Sign in and press the sync button in the app to pull the forms and master data for your
implementation.

## Documentation

- [Windows setup via WSL2](docs/dev-setup-windows-wsl2.md)
- [Front-end environment setup — Ubuntu](https://avni.readme.io/docs/environment-setup-for-front-end-product-development-ubuntu)
- [Full-stack environment setup](https://avni.readme.io/docs/developer-environment-setup-ubuntu)
- [Avni developer docs](https://avni.readme.io/docs)

## License

AGPL — see [LICENSE](LICENSE).
