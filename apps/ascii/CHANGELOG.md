## [1.25.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.24.0...v1.25.0) (2026-07-16)

### Features

* **ascii:** trim TXT Export to the fit region ([#66](https://github.com/andraderaul/ascii-art-converter/issues/66)) ([#69](https://github.com/andraderaul/ascii-art-converter/issues/69)) ([64106b8](https://github.com/andraderaul/ascii-art-converter/commit/64106b8c807b2f9a4ec9297e8125b3e3ddf911b1)), closes [#65](https://github.com/andraderaul/ascii-art-converter/issues/65)

## [1.24.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.23.0...v1.24.0) (2026-07-16)

### Features

* **canvas:** clear-source control + LIVE badge overlay ([#68](https://github.com/andraderaul/ascii-art-converter/issues/68)) ([92ff123](https://github.com/andraderaul/ascii-art-converter/commit/92ff1230b60ba17fb644c206cce0153e7a1c7b6e))

## [1.23.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.22.1...v1.23.0) (2026-07-16)

### Features

* **ascii:** contain-fit preserving Source aspect ratio ([#65](https://github.com/andraderaul/ascii-art-converter/issues/65)) ([#67](https://github.com/andraderaul/ascii-art-converter/issues/67)) ([eb46a1e](https://github.com/andraderaul/ascii-art-converter/commit/eb46a1e66fe8b6fab8300dac005591d9a9b9e77e))

### Code Refactoring

* **arch:** adapter contracts, use-ai-config silent failures, render-frame extraction ([#64](https://github.com/andraderaul/ascii-art-converter/issues/64)) ([c150040](https://github.com/andraderaul/ascii-art-converter/commit/c150040eaa31a87313a070806e27d75e8dcd4db1))

## [1.22.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.22.0...v1.22.1) (2026-05-30)

### Bug Fixes

* leak test ([756980f](https://github.com/andraderaul/ascii-art-converter/commit/756980f13270e0f7e85e8c8f0006aa98bb5b9aa5))

### Code Refactoring

* **ai:** shared adapter helpers + provider Record map ([#61](https://github.com/andraderaul/ascii-art-converter/issues/61)) ([70ca429](https://github.com/andraderaul/ascii-art-converter/commit/70ca429deb69380964fdd0a9acfeb5cf74c5d8a2))
* **ui:** ApiKeyModal Button adoption + HeaderButton primitive ([#62](https://github.com/andraderaul/ascii-art-converter/issues/62)) ([0aaf31f](https://github.com/andraderaul/ascii-art-converter/commit/0aaf31fe4a925402eb25828be703a15d79b34a57)), closes [#53](https://github.com/andraderaul/ascii-art-converter/issues/53) [#54](https://github.com/andraderaul/ascii-art-converter/issues/54)
* **ui:** split DownloadBar into LiveSourceBar + ExportBar ([#63](https://github.com/andraderaul/ascii-art-converter/issues/63)) ([29b46fa](https://github.com/andraderaul/ascii-art-converter/commit/29b46fa49507eddb6941607967f3ab6d73d4f400))

## [1.22.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.21.0...v1.22.0) (2026-05-22)

### Features

* **hooks:** extract useDialog and adopt in Modal + MobileBottomSheet ([#60](https://github.com/andraderaul/ascii-art-converter/issues/60)) ([171ed3d](https://github.com/andraderaul/ascii-art-converter/commit/171ed3d3e9f00d1f8d37cede0b81a63559e2d362)), closes [#49](https://github.com/andraderaul/ascii-art-converter/issues/49)

## [1.21.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.20.0...v1.21.0) (2026-05-22)

### Features

* **ui:** SourceImageDropZone primitive + WebcamState type export ([#59](https://github.com/andraderaul/ascii-art-converter/issues/59)) ([e903868](https://github.com/andraderaul/ascii-art-converter/commit/e90386861a816cff59a25e23ee053aefeb2575cf)), closes [#52](https://github.com/andraderaul/ascii-art-converter/issues/52) [#48](https://github.com/andraderaul/ascii-art-converter/issues/48)

### Code Refactoring

* **analysis-modal:** unify THREAT_META record and extract ScanErrorState component ([#57](https://github.com/andraderaul/ascii-art-converter/issues/57)) ([a6124f8](https://github.com/andraderaul/ascii-art-converter/commit/a6124f809a4a76a4a72a63c9bf34c017b3893330))

## [1.20.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.19.0...v1.20.0) (2026-05-21)

### Features

* **ui:** Chip primitive + DownloadBar cleanup ([#56](https://github.com/andraderaul/ascii-art-converter/issues/56)) ([bccabea](https://github.com/andraderaul/ascii-art-converter/commit/bccabeaf856f295f0ad96545d53a44edcb8ed439)), closes [#47](https://github.com/andraderaul/ascii-art-converter/issues/47) [#55](https://github.com/andraderaul/ascii-art-converter/issues/55)

### Documentation

* **claude:** fix and complete CLAUDE.md key files ([1a4f06d](https://github.com/andraderaul/ascii-art-converter/commit/1a4f06db33f7eec9bdc141580c343c412c889565))
* **readme:** add missing ADRs 0006–0009 to architectural decisions table ([3c58cc8](https://github.com/andraderaul/ascii-art-converter/commit/3c58cc820e43a4ee40fe061a594e75284902f807))
* **readme:** remove project structure section ([299ea63](https://github.com/andraderaul/ascii-art-converter/commit/299ea63e0c8b32c467cc164ba40b7345e37de9a1))

## [1.19.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.18.0...v1.19.0) (2026-05-21)

### Features

* **api-key-modal:** show provider key-generation link below select ([#44](https://github.com/andraderaul/ascii-art-converter/issues/44)) ([4658580](https://github.com/andraderaul/ascii-art-converter/commit/465858025dac1f12ef9d3f46fcdf560ef47b386a)), closes [#7](https://github.com/andraderaul/ascii-art-converter/issues/7)

## [1.18.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.17.3...v1.18.0) (2026-05-21)

### Features

* **control-panel:** label preset section and improve modified indicator ([#45](https://github.com/andraderaul/ascii-art-converter/issues/45)) ([59b3b7c](https://github.com/andraderaul/ascii-art-converter/commit/59b3b7cfaa2e632a208936dec23d7e70f981273f)), closes [#39](https://github.com/andraderaul/ascii-art-converter/issues/39) [#ffe600](https://github.com/andraderaul/ascii-art-converter/issues/ffe600)

## [1.17.3](https://github.com/andraderaul/ascii-art-converter/compare/v1.17.2...v1.17.3) (2026-05-21)

### Bug Fixes

* **contrast:** wcag aa audit — replace text-muted with text-fg-subtle ([#43](https://github.com/andraderaul/ascii-art-converter/issues/43)) ([6f8e6e4](https://github.com/andraderaul/ascii-art-converter/commit/6f8e6e4982ce971f8594a7badf5f70325d787f67)), closes [#38](https://github.com/andraderaul/ascii-art-converter/issues/38) [#7e7eaf](https://github.com/andraderaul/ascii-art-converter/issues/7e7eaf)

## [1.17.2](https://github.com/andraderaul/ascii-art-converter/compare/v1.17.1...v1.17.2) (2026-05-21)

### Bug Fixes

* route EmptyStateHero webcam button through switchMode ([#40](https://github.com/andraderaul/ascii-art-converter/issues/40)) ([e1153c6](https://github.com/andraderaul/ascii-art-converter/commit/e1153c6e8c561175cebcd56a27619723c5cff7a2)), closes [#36](https://github.com/andraderaul/ascii-art-converter/issues/36)

## [1.17.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.17.0...v1.17.1) (2026-05-21)

### Bug Fixes

* **about-modal:** apply neutral register to section headings ([#42](https://github.com/andraderaul/ascii-art-converter/issues/42)) ([95f7f89](https://github.com/andraderaul/ascii-art-converter/commit/95f7f89e72cc62cef2a56b573f9b9c20752cda00)), closes [#8](https://github.com/andraderaul/ascii-art-converter/issues/8)

## [1.17.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.16.1...v1.17.0) (2026-05-21)

### Features

* **banner:** add AI Config banner near DownloadBar when no AI Config is set ([#41](https://github.com/andraderaul/ascii-art-converter/issues/41)) ([cef88d1](https://github.com/andraderaul/ascii-art-converter/commit/cef88d12fb91746506ebbcf5a1b88333a3c09035)), closes [#6](https://github.com/andraderaul/ascii-art-converter/issues/6)

## [1.16.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.16.0...v1.16.1) (2026-05-20)

### Bug Fixes

* hide DownloadBar when no source is loaded ([c73500f](https://github.com/andraderaul/ascii-art-converter/commit/c73500f7de463ad521a988437f09f19c0663871d))

## [1.16.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.15.1...v1.16.0) (2026-05-20)

### Features

* **header:** 44px touch target + configure-ai pill border ([#32](https://github.com/andraderaul/ascii-art-converter/issues/32)) ([3588eef](https://github.com/andraderaul/ascii-art-converter/commit/3588eeff6c7febdef961d9d8d593972794ed8a25))

## [1.15.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.15.0...v1.15.1) (2026-05-20)

### Bug Fixes

* expand header button touch targets ([#23](https://github.com/andraderaul/ascii-art-converter/issues/23)) ([59ccf2c](https://github.com/andraderaul/ascii-art-converter/commit/59ccf2cb35bdd2a9741d7abdedb8de05bf94eca7))

## [1.15.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.14.0...v1.15.0) (2026-05-20)

### Features

* **presets:** named ConversionSettings presets with modified indicator ([#30](https://github.com/andraderaul/ascii-art-converter/issues/30)) ([317de7e](https://github.com/andraderaul/ascii-art-converter/commit/317de7ef6ae8cc01407f4a35f4f7410be2d1c51d))
* **toast:** info/warn/error variants + neutral error copy ([#33](https://github.com/andraderaul/ascii-art-converter/issues/33)) ([a02aeb2](https://github.com/andraderaul/ascii-art-converter/commit/a02aeb2aa34409d4d41b7cfc762a3e98af50194f))

## [1.14.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.13.0...v1.14.0) (2026-05-20)

### Features

* **a11y:** slider aria-valuetext, threat icon, contrast fix ([#31](https://github.com/andraderaul/ascii-art-converter/issues/31)) ([695e404](https://github.com/andraderaul/ascii-art-converter/commit/695e4047d9aa2fe84cc54eaba20558f3000bdce5)), closes [#9898c0](https://github.com/andraderaul/ascii-art-converter/issues/9898c0) [#6b6b9a](https://github.com/andraderaul/ascii-art-converter/issues/6b6b9a)
* **download-bar:** png scale picker (1×/2×/4×) + output resolution ([#35](https://github.com/andraderaul/ascii-art-converter/issues/35)) ([ea475ea](https://github.com/andraderaul/ascii-art-converter/commit/ea475ea964c80597eba6598d131ab4e6162875b6))

## [1.13.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.12.0...v1.13.0) (2026-05-20)

### Features

* **modal:** escape-to-close and focus trap ([#34](https://github.com/andraderaul/ascii-art-converter/issues/34)) ([017db3f](https://github.com/andraderaul/ascii-art-converter/commit/017db3fe0c07e7426bdd307c92214ccfaeffea49))

## [1.12.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.11.0...v1.12.0) (2026-05-19)

### Features

* **button:** add record variant; separate live-initiation from export ([#29](https://github.com/andraderaul/ascii-art-converter/issues/29)) ([640a9df](https://github.com/andraderaul/ascii-art-converter/commit/640a9df0f0df7098f99ada4e629d0f3a8a15caf3)), closes [#14](https://github.com/andraderaul/ascii-art-converter/issues/14)

## [1.11.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.10.0...v1.11.0) (2026-05-19)

### Features

* **upload-zone:** expose mirror toggle in webcam panel ([#28](https://github.com/andraderaul/ascii-art-converter/issues/28)) ([6422a85](https://github.com/andraderaul/ascii-art-converter/commit/6422a854cad50d9b0b857e263065f208a6f61242)), closes [#12](https://github.com/andraderaul/ascii-art-converter/issues/12)

## [1.10.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.9.0...v1.10.0) (2026-05-19)

### Features

* **control-panel:** inline info tooltips for all five controls ([#27](https://github.com/andraderaul/ascii-art-converter/issues/27)) ([3342c29](https://github.com/andraderaul/ascii-art-converter/commit/3342c299ff566dff9eacb3572c9eb92b0b687b3f)), closes [#11](https://github.com/andraderaul/ascii-art-converter/issues/11)

## [1.9.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.8.0...v1.9.0) (2026-05-19)

### Features

* **recording:** split timer pill from stop, add DOM REC overlay ([#25](https://github.com/andraderaul/ascii-art-converter/issues/25)) ([3b26549](https://github.com/andraderaul/ascii-art-converter/commit/3b2654924d77c48f53bf8f89bba1693702a5eba5)), closes [#9](https://github.com/andraderaul/ascii-art-converter/issues/9)

## [1.8.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.7.0...v1.8.0) (2026-05-19)

### Features

* **slider:** default marker, marks ticks, and double-click reset ([#24](https://github.com/andraderaul/ascii-art-converter/issues/24)) ([85ec903](https://github.com/andraderaul/ascii-art-converter/commit/85ec903230b2ff54655d5f01bb4c7196f5f90eb7)), closes [#8](https://github.com/andraderaul/ascii-art-converter/issues/8)

### Documentation

* add voice and tone guideline (cyberpunk vs neutral registers) ([#26](https://github.com/andraderaul/ascii-art-converter/issues/26)) ([b1ed68d](https://github.com/andraderaul/ascii-art-converter/commit/b1ed68d8d5f1961d68e32221207b0089e6b52aa6)), closes [#10](https://github.com/andraderaul/ascii-art-converter/issues/10)

## [1.7.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.6.0...v1.7.0) (2026-05-19)

### Features

* grouped Charset picker and Color Mode swatches ([#22](https://github.com/andraderaul/ascii-art-converter/issues/22)) ([f90a44b](https://github.com/andraderaul/ascii-art-converter/commit/f90a44b999d1b7b53fea80798f334e07e7936db7)), closes [#4](https://github.com/andraderaul/ascii-art-converter/issues/4) [#5](https://github.com/andraderaul/ascii-art-converter/issues/5)

## [1.6.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.5.0...v1.6.0) (2026-05-19)

### Features

* mobile bottom-sheet with Source/Settings tabs ([#21](https://github.com/andraderaul/ascii-art-converter/issues/21)) ([6f2abfc](https://github.com/andraderaul/ascii-art-converter/commit/6f2abfc2c54d7f59abb5f2563b2a260478fe2ffa)), closes [#3](https://github.com/andraderaul/ascii-art-converter/issues/3) [#1](https://github.com/andraderaul/ascii-art-converter/issues/1) [#4](https://github.com/andraderaul/ascii-art-converter/issues/4) [#2](https://github.com/andraderaul/ascii-art-converter/issues/2) [#3](https://github.com/andraderaul/ascii-art-converter/issues/3) [#6](https://github.com/andraderaul/ascii-art-converter/issues/6) [#7](https://github.com/andraderaul/ascii-art-converter/issues/7) [#5](https://github.com/andraderaul/ascii-art-converter/issues/5) [#8](https://github.com/andraderaul/ascii-art-converter/issues/8)

## [1.5.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.4.0...v1.5.0) (2026-05-19)

### Features

* empty-state hero with dual CTA in canvas area ([#20](https://github.com/andraderaul/ascii-art-converter/issues/20)) ([8b17ea9](https://github.com/andraderaul/ascii-art-converter/commit/8b17ea972814ccb7c07ed88296274ae1281da032)), closes [#2](https://github.com/andraderaul/ascii-art-converter/issues/2)

## [1.4.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.3.1...v1.4.0) (2026-05-18)

### Features

* add synthwave and matrix-dual dual-color ([c807a8c](https://github.com/andraderaul/ascii-art-converter/commit/c807a8ca6433f3e285e1d94cb0f55d013e3881ce)), closes [#1](https://github.com/andraderaul/ascii-art-converter/issues/1) [#ccff00](https://github.com/andraderaul/ascii-art-converter/issues/ccff00) [#ff0099](https://github.com/andraderaul/ascii-art-converter/issues/ff0099) [#ff4500](https://github.com/andraderaul/ascii-art-converter/issues/ff4500) [#0066ff](https://github.com/andraderaul/ascii-art-converter/issues/0066ff) [#00ffff](https://github.com/andraderaul/ascii-art-converter/issues/00ffff) [#ff00ff](https://github.com/andraderaul/ascii-art-converter/issues/ff00ff) [#0066ff](https://github.com/andraderaul/ascii-art-converter/issues/0066ff) [#ff4500](https://github.com/andraderaul/ascii-art-converter/issues/ff4500) [#ff4500](https://github.com/andraderaul/ascii-art-converter/issues/ff4500) [#0066ff](https://github.com/andraderaul/ascii-art-converter/issues/0066ff)

## [1.3.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.3.0...v1.3.1) (2026-05-05)

### Bug Fixes

* **modal:** fix overlay appearing completely dark due to same color as background ([ab85c02](https://github.com/andraderaul/ascii-art-converter/commit/ab85c023e7ae1a56131696f5461975f354008bb3)), closes [#0a0a0f](https://github.com/andraderaul/ascii-art-converter/issues/0a0a0f)

## [1.3.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.2.3...v1.3.0) (2026-05-05)

### Features

* **charset:** expand charset library from 4 to 12 options ([4010b78](https://github.com/andraderaul/ascii-art-converter/commit/4010b7894f3440250b75f912190301ab395c5a13))

### Bug Fixes

* improve file download in desktop ([e895b25](https://github.com/andraderaul/ascii-art-converter/commit/e895b258e13e486f95f57fbdea5a6124a1921a8a))

## [1.2.3](https://github.com/andraderaul/ascii-art-converter/compare/v1.2.2...v1.2.3) (2026-05-04)

### Bug Fixes

* should-fix and accessibility items from TODO ([a7508dc](https://github.com/andraderaul/ascii-art-converter/commit/a7508dc8a46ccecfd7e7e776f6ca7fd83e3e6419))

## [1.2.2](https://github.com/andraderaul/ascii-art-converter/compare/v1.2.1...v1.2.2) (2026-05-04)

### Bug Fixes

* **ai:** introduce NetworkError and guard unknown providers ([ba5be74](https://github.com/andraderaul/ascii-art-converter/commit/ba5be74a75558fba9ce4d27fbf6f509185382124))

### Documentation

* update CLAUDE.md to reflect current codebase state ([d167df0](https://github.com/andraderaul/ascii-art-converter/commit/d167df08c8da5e98c0bf55f14d6832746709165b))

## [1.2.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.2.0...v1.2.1) (2026-05-04)

### Bug Fixes

* give honest toast messages when localStorage is unavailable ([5b55e3c](https://github.com/andraderaul/ascii-art-converter/commit/5b55e3ca766aff11027f25acac08ab1118b9ff65))

### Code Refactoring

* streamline blob sharing and downloading in recording and download components ([bd3965c](https://github.com/andraderaul/ascii-art-converter/commit/bd3965cf2b81ab695a0f808256b3c8e6ef68debc))

## [1.2.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.1.1...v1.2.0) (2026-05-03)

### Features

* add toast error system for storage and export failures ([44263ff](https://github.com/andraderaul/ascii-art-converter/commit/44263fff43ceba7b419fb0381c994fd5e3fb9698))
* enhance DownloadBar with recording functionality ([d406be3](https://github.com/andraderaul/ascii-art-converter/commit/d406be356fd0c1db461feab6ff7181220804d18f))

### Documentation

* add adr seven ([9c77ace](https://github.com/andraderaul/ascii-art-converter/commit/9c77aceff245a29451fa40915869a81add0f47c4))
* add demo GIF and AI analysis screenshot to README ([0400663](https://github.com/andraderaul/ascii-art-converter/commit/04006630ee86837e4b0279bf2dc2e601913d30e4))

### Code Refactoring

* improve download ([c8c6f05](https://github.com/andraderaul/ascii-art-converter/commit/c8c6f057ccd7edafa2c3ad35f08a4887193be369))
* improve slider gesture ([8d4d87a](https://github.com/andraderaul/ascii-art-converter/commit/8d4d87a29afa6ed1a56ea1f9228f37da4c916f33))
* update tags ([86926a8](https://github.com/andraderaul/ascii-art-converter/commit/86926a8ba86252aa5082d4ebc848e934ce45137e))

## [1.1.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.1.0...v1.1.1) (2026-05-02)

### Bug Fixes

* improve slider drag on mobile with touch-action pan-y ([ea4aadc](https://github.com/andraderaul/ascii-art-converter/commit/ea4aadc22bc3f7d22d6e3a7589e3141a3d2afdff))

### Code Refactoring

* extract Badge and ErrorText to ui/ ([7d2e2b0](https://github.com/andraderaul/ascii-art-converter/commit/7d2e2b009d8728d32f5e08b488bfa3b01a0da5a2))
* extract Button to ui/, unify 5 variants across download-bar, analysis-modal, upload-zone ([d78f333](https://github.com/andraderaul/ascii-art-converter/commit/d78f333d61b766a4d5aa25c5e76cb48be89c46ba))
* update prompt ([5b05764](https://github.com/andraderaul/ascii-art-converter/commit/5b057644b7c154f5ae87787d7c18c1b82bf5095f))

## [1.1.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.0.0...v1.1.0) (2026-05-02)

### Features

* AI narrative analysis via user-provided API key ([6779dcb](https://github.com/andraderaul/ascii-art-converter/commit/6779dcb53e855e809630fae9c545c2c2f1118069))
* extract shared Modal primitive with backdrop blur and two variants ([56dbc58](https://github.com/andraderaul/ascii-art-converter/commit/56dbc5881e71fc0334745e5432727c43c820ed71))
* mobile-responsive header, download bar, and layout fixes ([685dea9](https://github.com/andraderaul/ascii-art-converter/commit/685dea9469aef5a9f25acc1c9a0f2e4a51ffc872))

### Bug Fixes

* memoize handleAnalyze with useCallback ([b6264ad](https://github.com/andraderaul/ascii-art-converter/commit/b6264ad04af8bcfcacc52bc51a8ad7dacea5dc63))
* narrow COLOR_MODE_COLORS to Partial<Record<ColorMode, string>> ([071cc4b](https://github.com/andraderaul/ascii-art-converter/commit/071cc4b975d52d8c8ad8f1b935a3d3165b200297))
* remove non-null assertions and surface upload/webcam errors ([0f650f5](https://github.com/andraderaul/ascii-art-converter/commit/0f650f566522e12c56a57d90a634cdf90f14e4b5))
* replace modal backdrop divs and drop zone with accessible elements ([0b1681c](https://github.com/andraderaul/ascii-art-converter/commit/0b1681c67aa88d94eeb76e383575438243063fbc))
* return canvas directly from resizeImage to eliminate async decode race ([42d3a02](https://github.com/andraderaul/ascii-art-converter/commit/42d3a02a541c0bc10633285c26a6b318d0b34fbc))
* sync canvas pixel buffer to display size via ResizeObserver ([b05b0f3](https://github.com/andraderaul/ascii-art-converter/commit/b05b0f374056c92a2974f0cac5898477c98a4f83))

### Performance Improvements

* read CSS font family once on mount instead of every paintFrame call ([c5d803e](https://github.com/andraderaul/ascii-art-converter/commit/c5d803e0fda9c8ec29e6bf48a1dd855986ad7dd5))

### Code Refactoring

* create device utils ([a1458cc](https://github.com/andraderaul/ascii-art-converter/commit/a1458cccee72542f0318b980331208cd9aa1f3fe))
* enhance type safety in useWebcamState hook ([23c4ff7](https://github.com/andraderaul/ascii-art-converter/commit/23c4ff7a72590c9080fd464ad100c8cf62ae6170))
* extract Slider and Label to ui/, unify Resolution control ([c07e0a7](https://github.com/andraderaul/ascii-art-converter/commit/c07e0a7cfc9dc17606fb3363752f61f86570cf72))
* extract ToggleGroup to ui/, unify upload-zone tabs ([893ddf8](https://github.com/andraderaul/ascii-art-converter/commit/893ddf833e7a7b53141055e31600a597e95f56f1))
* extract triggerDownload to eliminate exportPng/capture duplication ([de7bb6f](https://github.com/andraderaul/ascii-art-converter/commit/de7bb6f4b0b74feb47ec5d3ffcf1605d388c8474))
* extract useWebcamState hook with useReducer from UploadZone ([159d2f2](https://github.com/andraderaul/ascii-art-converter/commit/159d2f2f79c9222b48165d1e135d262027d896f7))
* move AnalysisState from analysis-modal.tsx to ai/types.ts ([20f6d24](https://github.com/andraderaul/ascii-art-converter/commit/20f6d246de38d63bf800fd9b3bd56c72038b4c4a))
* name ASCII conversion and rendering constants ([ff755f4](https://github.com/andraderaul/ascii-art-converter/commit/ff755f447cbc2b24403cd53da87f5592e8deb03f))
* remove over-extracted constants from converter ([70fb9a0](https://github.com/andraderaul/ascii-art-converter/commit/70fb9a00ce025aee35e622b4e3dfd7d794643591))
* replace 3 modal useState with ActiveModal discriminated union ([87542b6](https://github.com/andraderaul/ascii-art-converter/commit/87542b65dab8273ec887fd96ac6e9b35a0c29058))
* replace inline styles with Tailwind classes in AI modals ([dc8550c](https://github.com/andraderaul/ascii-art-converter/commit/dc8550c29d06eee3b9949122ec9f4e7c85c8de75))
* restructure ASCII domain module, add quality gates and portfolio docs ([18cf58e](https://github.com/andraderaul/ascii-art-converter/commit/18cf58e6303f62f68e18e131244b1cea173517d3))
* tailwind ([dea021f](https://github.com/andraderaul/ascii-art-converter/commit/dea021f134d36eca3c8f52aa0bf9f526fd70551a))
* use as const instead of as SourceMode cast in UploadZone ([c327678](https://github.com/andraderaul/ascii-art-converter/commit/c3276786b35fec4e9df9f6899d3ec4d11599ba7e))
