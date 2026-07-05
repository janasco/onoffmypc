import java.io.FileInputStream
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// Apply the Firebase google-services plugin only when a config file is present,
// so the project still builds without it (CI, fresh checkout). Add your
// app/google-services.json from the Firebase console to enable FCM. See PUSH.md.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

// Release signing credentials come from CI env vars, or a local (gitignored)
// keystore.properties for local release builds. When neither is present (e.g. a
// clean checkout), the release build is simply left unsigned — debug is unaffected.
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) FileInputStream(keystorePropsFile).use { load(it) }
}
fun signingValue(env: String, prop: String): String? =
    System.getenv(env) ?: keystoreProps.getProperty(prop)

android {
    namespace = "com.onoffmypc.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.onoffmypc.android"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "0.1.2"
        vectorDrawables { useSupportLibrary = true }
    }

    signingConfigs {
        create("release") {
            val storePath = signingValue("KEYSTORE_FILE", "storeFile")
            if (storePath != null) {
                storeFile = file(storePath)
                storePassword = signingValue("KEYSTORE_PASSWORD", "storePassword")
                keyAlias = signingValue("KEY_ALIAS", "keyAlias")
                keyPassword = signingValue("KEY_PASSWORD", "keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // Sign only when a keystore was configured; otherwise stay unsigned.
            signingConfig = signingConfigs.getByName("release").takeIf { it.storeFile != null }
            // R8 disabled for the first release to avoid mis-stripping the
            // reflection-based networking stack; enable with the keep rules in
            // proguard-rules.pro once verified on a device.
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    // buildConfig = true is required for the generated BuildConfig class
    // (ApiClient gates HTTP logging on BuildConfig.DEBUG); AGP 8 defaults it off.
    buildFeatures {
        compose = true
        buildConfig = true
    }

    // Kotlin sources live under src/main/kotlin.
    sourceSets["main"].java.srcDirs("src/main/kotlin")
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)

    // Networking
    implementation(libs.retrofit)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)

    // Firebase Cloud Messaging (push). Runtime is inert until app/google-services.json is added.
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
    implementation(libs.androidx.security.crypto)

    debugImplementation(libs.androidx.ui.tooling)
}
