## fastlane documentation

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios verify

```sh
[bundle exec] fastlane ios verify
```

Run every local web and native release gate

### ios prepare

```sh
[bundle exec] fastlane ios prepare
```

Build the production web app and copy it into the iOS project

### ios candidate

```sh
[bundle exec] fastlane ios candidate
```

Verify and export a signed local App Store candidate without uploading

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build the verified candidate and upload it to TestFlight

### ios metadata

```sh
[bundle exec] fastlane ios metadata
```

Push listing metadata and screenshots without uploading a binary

### ios submit

```sh
[bundle exec] fastlane ios submit
```

Submit the App Store Connect version that is already configured

---

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
