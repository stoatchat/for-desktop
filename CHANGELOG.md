# Changelog

## [1.3.0](https://github.com/stoatchat/for-desktop/compare/v1.2.0...v1.3.0) (2026-02-18)


### Features

* minimise-to-tray-on-startup ([#126](https://github.com/stoatchat/for-desktop/issues/126)) ([8284117](https://github.com/stoatchat/for-desktop/commit/8284117e76c0fcff4091de3ef623014e4594a593))
* Reload/Refresh shortcut ([#119](https://github.com/stoatchat/for-desktop/issues/119)) ([2e99b19](https://github.com/stoatchat/for-desktop/commit/2e99b19353fbd45d9fdf1d148bae3a8a19c788ed))


### Bug Fixes

* Add common zoom-reset shortcut. ([#112](https://github.com/stoatchat/for-desktop/issues/112)) ([def29f9](https://github.com/stoatchat/for-desktop/commit/def29f9b3c1205944aab58beb8000815d41633b5))
* allow CTRL+"+" to also zoom in. ([#108](https://github.com/stoatchat/for-desktop/issues/108)) ([2b962c5](https://github.com/stoatchat/for-desktop/commit/2b962c5d066787601223368ee7dcc1e46a345b8a))
* App-maximized-2nd-monitor ([897d706](https://github.com/stoatchat/for-desktop/commit/897d706983a347938a2fb42ba8e58e40794bba13))
* don't re-enable abutostart ([63b9ea8](https://github.com/stoatchat/for-desktop/commit/63b9ea818a9f32ca8535948e18752726c0f50a12))
* firstLaunch = false after initial setup ([#131](https://github.com/stoatchat/for-desktop/issues/131)) ([63b9ea8](https://github.com/stoatchat/for-desktop/commit/63b9ea818a9f32ca8535948e18752726c0f50a12))
* flatpak icons not building correctly and wayland support ([#132](https://github.com/stoatchat/for-desktop/issues/132)) ([ffe17ec](https://github.com/stoatchat/for-desktop/commit/ffe17ec2c54fca6967435b8a4ada7fa8d4da7b33))
* replace default dialog with notification ([#98](https://github.com/stoatchat/for-desktop/issues/98)) ([7d2f296](https://github.com/stoatchat/for-desktop/commit/7d2f296ca72bbd7ad694c66a917d47067f883fc5))
* toggle window visibility on tray click instead of always showing ([#103](https://github.com/stoatchat/for-desktop/issues/103)) ([742a95f](https://github.com/stoatchat/for-desktop/commit/742a95f3cb820c5b5398c815b7b45017b6b06053))
* try to restore maximised windows to correct display ([#92](https://github.com/stoatchat/for-desktop/issues/92)) ([897d706](https://github.com/stoatchat/for-desktop/commit/897d706983a347938a2fb42ba8e58e40794bba13))
* use template icon for macOS tray, use higher res icons for other platforms ([#130](https://github.com/stoatchat/for-desktop/issues/130)) ([58ccb63](https://github.com/stoatchat/for-desktop/commit/58ccb63d23541a03e05a48a37a98f883a2ba0d3f))

## [1.2.0](https://github.com/stoatchat/for-desktop/compare/v1.1.12...v1.2.0) (2026-02-14)


### Features

* new branding ([#87](https://github.com/stoatchat/for-desktop/issues/87)) ([8910dcb](https://github.com/stoatchat/for-desktop/commit/8910dcba923b55df789c0541b59a6a6321a28768))
* persist and restore window size and position ([#74](https://github.com/stoatchat/for-desktop/issues/74)) ([3bf697d](https://github.com/stoatchat/for-desktop/commit/3bf697d1a9aba739b6954c8469223f51093497cc))


### Bug Fixes

* App Autostart ([#68](https://github.com/stoatchat/for-desktop/issues/68)) ([127d143](https://github.com/stoatchat/for-desktop/commit/127d1430a9c630e0429c9cc50d57ee316a63ebe5))

## [1.1.12](https://github.com/stoatchat/for-desktop/compare/v1.1.11...v1.1.12) (2025-12-29)


### Bug Fixes

* add NixOS compatibility for electron startup ([#23](https://github.com/stoatchat/for-desktop/issues/23)) ([3eb9b8e](https://github.com/stoatchat/for-desktop/commit/3eb9b8e84bf05debf9843b80c468911fd095f4a0))
* correctly load badge count; expose to renderer ([#25](https://github.com/stoatchat/for-desktop/issues/25)) ([6817b55](https://github.com/stoatchat/for-desktop/commit/6817b554e57c5a65b7b4aca7d1cc4e05cd6f01b7))
* event listener accumulation from rpc client ([#26](https://github.com/stoatchat/for-desktop/issues/26)) ([96fa8cc](https://github.com/stoatchat/for-desktop/commit/96fa8cc647029cb53e5d619b94debc6cdfdf32f6))
* **macos:** tray icon size ([5eecab5](https://github.com/stoatchat/for-desktop/commit/5eecab59431cb4966eaa1fc907a8e5c16c813230))
* rpc should define largeImageText ([#21](https://github.com/stoatchat/for-desktop/issues/21)) ([cb373b6](https://github.com/stoatchat/for-desktop/commit/cb373b6dc62630147151039c3711aef74c8c2d88))
* use the correct argument for auto start ([#22](https://github.com/stoatchat/for-desktop/issues/22)) ([532af4a](https://github.com/stoatchat/for-desktop/commit/532af4a680069f72734148b0ccdacec6c435e640)), closes [#20](https://github.com/stoatchat/for-desktop/issues/20)
