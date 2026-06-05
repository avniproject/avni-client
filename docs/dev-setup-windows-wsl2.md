# Windows setup (WSL2)

The build tooling is Make + bash, so it does not run on native Windows. The supported route is
**WSL2 with Ubuntu**: everything (Node, Java, Android SDK, the build) lives inside WSL; your
phone or emulator connects to it through `adb`.

Time budget for a first-time setup: roughly 1–2 hours, most of it downloads.

## 1. Install WSL2 + Ubuntu

In PowerShell **as Administrator**:

```powershell
wsl --install -d Ubuntu-24.04
```

Reboot if asked, launch *Ubuntu* from the Start menu, and create your Linux username/password.
Everything below runs **inside the Ubuntu shell** unless marked *(Windows)*.

> **Keep the repo inside the WSL filesystem** (e.g. `~/projects/...`), *not* under `/mnt/c/...`.
> Builds on `/mnt/c` are many times slower.

## 2. Base tooling

```bash
sudo apt update
sudo apt install -y git curl unzip zip make build-essential openjdk-17-jdk-headless
```

Install nvm (Node itself is installed later from the repo's `.nvmrc`):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# then close and reopen the Ubuntu terminal
```

## 3. Android SDK (command line only — no Android Studio needed in WSL)

Download the *"Command line tools only"* zip for **Linux** from
<https://developer.android.com/studio#command-line-tools-only>, then:

```bash
mkdir -p ~/Android/Sdk/cmdline-tools
cd ~/Android/Sdk/cmdline-tools
unzip ~/commandlinetools-linux-*.zip   # adjust path to where you downloaded it
mv cmdline-tools latest
```

Add to `~/.bashrc` (then `source ~/.bashrc`):

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
```

Install the exact packages this repo builds with:

```bash
sdkmanager --install "platform-tools" "platforms;android-35" "build-tools;35.0.0" "ndk;27.1.12297006"
sdkmanager --licenses   # accept all
```

## 4. Connect a device

### Option A — physical Android phone over USB (recommended)

On the phone: enable *Developer options* and *USB debugging*, plug it into the PC.

*(Windows, PowerShell as Administrator)* install [usbipd-win](https://github.com/dorssel/usbipd-win)
and hand the phone to WSL:

```powershell
winget install usbipd
usbipd list                              # find your phone's BUSID, e.g. 2-3
usbipd bind --busid <BUSID>              # once per device
usbipd attach --wsl --busid <BUSID>      # re-run after replugging (or add --auto-attach)
```

Back in Ubuntu:

```bash
adb devices    # phone shows up; accept the "Allow USB debugging?" prompt on the phone
```

### Option B — Android emulator on the Windows side

WSL2 cannot run the emulator well, so run it on Windows (install Android Studio on
Windows, create a virtual device, start it) and let the WSL build talk to the **Windows**
adb server:

1. *(Windows)* create/edit `C:\Users\<you>\.wslconfig`:

   ```ini
   [wsl2]
   networkingMode=mirrored
   ```

   then run `wsl --shutdown` and reopen Ubuntu. (Mirrored networking needs Windows 11
   22H2+; on older Windows use `ADB_SERVER_SOCKET=tcp:<windows-host-ip>:5037` instead.)

2. In Ubuntu:

   ```bash
   export ADB_SERVER_SOCKET=tcp:127.0.0.1:5037   # add to ~/.bashrc to persist
   adb devices                                   # should list emulator-5554
   ```

Keep the adb client versions on both sides reasonably in sync (`adb --version`) —
mismatched versions kill each other's server.

## 5. Clone, build, run

```bash
git clone https://github.com/avniproject/avni-client.git ~/projects/avni-client
cd ~/projects/avni-client

nvm install     # reads .nvmrc → Node 20
make deps       # npm install + patches + prebuild (takes a while the first time)
```

Point the app at your Avni server:

```bash
cp packages/openchs-android/config/env/dev.json.template packages/openchs-android/config/env/dev.json
# edit dev.json and set SERVER_URL to your Avni server
```

Then in two terminals:

```bash
make run_packager   # terminal 1 — Metro bundler, leave it running
make run-app        # terminal 2 — builds, installs and launches on the connected device
```

> Working from a fork with its own flavour (e.g. TANUH)? The same setup applies — only the
> final run target differs; check the fork's Readme for its `run_app_*` target.

## 6. First sync

Sign in with a user from your Avni server and press the **sync** button to pull the forms
and master data for your implementation.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `adb devices` empty after plugging the phone | Re-run `usbipd attach --wsl --busid <BUSID>` *(Windows)* — attachment doesn't survive replug unless you used `--auto-attach` |
| Red screen: *Unable to load script / could not connect to development server* | Ensure `make run_packager` is running; `adb reverse tcp:8081 tcp:8081`, then reload |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | A previous build with a different signature is installed — uninstall it: `adb uninstall <applicationId>` |
| `more than one device/emulator` | Disambiguate adb with `-s <serial>` (`adb devices` shows serials) |
| `[CXX1101] NDK ... did not have a source.properties file` | A partial NDK auto-download left an empty folder — delete it and `sdkmanager --install "ndk;27.1.12297006"` |
| Gradle can't reach `plugins.gradle.org` (corporate proxy) | Set `systemProp.https.proxyHost/Port` in `~/.gradle/gradle.properties` |
