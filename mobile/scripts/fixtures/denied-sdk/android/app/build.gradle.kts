// Negative fixture for the mobile hardening SDK denylist.
// This file is never part of the app build; it proves that an Adjust
// dependency in a scanned Gradle file fails the same gate that inspects
// the real Android project.
dependencies {
    implementation("com.adjust.sdk:adjust-android:4.38.0")
}
