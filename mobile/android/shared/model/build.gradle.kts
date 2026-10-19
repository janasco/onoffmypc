import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    // Target Java 17 bytecode, matching :app (sourceCompatibility,
    // targetCompatibility, and kotlinOptions.jvmTarget are all 17 there) and
    // the level AGP/D8 support for Android.
    //
    // This pins the *output* version rather than selecting a JDK via
    // jvmToolchain(), so it compiles correctly on a JDK 17 CI runner and on a
    // JDK 21 developer machine alike. The previous `jvmToolchain(21)` emitted
    // Java 21 class files, which made :app's unit tests fail with
    // UnsupportedClassVersionError on the Java 17 CI runner while passing
    // locally on a Java 21 host.
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(libs.kotlinx.serialization.json)
    testImplementation(libs.junit)
}
