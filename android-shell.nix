# Project-local Android build toolchain (no system change, reversible).
# Enter with:  nix-shell android-shell.nix
{ pkgs ? import <nixpkgs> {
    config = {
      android_sdk.accept_license = true;
      allowUnfree = true;
    };
  }
}:

let
  android = pkgs.androidenv.composeAndroidPackages {
    platformVersions = [ "35" "36" ];
    buildToolsVersions = [ "35.0.0" "36.0.0" ];
    includeEmulator = false;
    includeSystemImages = false;
    includeNDK = false;
    cmdLineToolsVersion = "latest";
  };
  sdk = "${android.androidsdk}/libexec/android-sdk";
in
pkgs.mkShell {
  buildInputs = [ pkgs.jdk21 android.androidsdk ];

  ANDROID_HOME = sdk;
  ANDROID_SDK_ROOT = sdk;
  JAVA_HOME = "${pkgs.jdk21}";

  # NixOS gotcha: the AGP-bundled aapt2 can't run (dynamic linker); point gradle
  # at the nix-provided aapt2 instead.
  GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${sdk}/build-tools/36.0.0/aapt2";

  shellHook = ''
    echo "Android SDK: $ANDROID_HOME"
    echo "JDK: $(java -version 2>&1 | head -1)"
  '';
}
