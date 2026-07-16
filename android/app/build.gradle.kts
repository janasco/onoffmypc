import java.io.FileInputStream
import java.io.File
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

// Release signing credentials come from CI env vars, the mobile repo's
// gitignored .env, or legacy android/keystore.properties (in that order). When
// none is present, release stays unsigned and debug builds are unaffected.
val mobileRootDir = rootProject.projectDir.parentFile
val mobileEnvFile = File(mobileRootDir, ".env")
val signingEnvKeys = setOf("KEYSTORE_FILE", "KEYSTORE_PASSWORD", "KEY_ALIAS", "KEY_PASSWORD")
val mobileEnv: Map<String, String> = if (!mobileEnvFile.exists()) {
    emptyMap()
} else {
    mobileEnvFile.useLines { lines ->
        lines.mapNotNull { rawLine ->
            val line = rawLine.removeSuffix("\r").trimStart()
            if (line.isBlank() || line.startsWith("#")) return@mapNotNull null
            val separator = line.indexOf('=')
            if (separator <= 0) return@mapNotNull null
            val key = line.substring(0, separator).trim()
            if (key !in signingEnvKeys) return@mapNotNull null
            var value = line.substring(separator + 1).trim()
            if (value.length >= 2 &&
                ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith('\'') && value.endsWith('\'')))) {
                value = value.substring(1, value.length - 1)
            }
            key to value
        }.toMap()
    }
}
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) FileInputStream(keystorePropsFile).use { load(it) }
}
fun signingValue(env: String, prop: String): String? =
    System.getenv(env)?.takeIf { it.isNotBlank() }
        ?: mobileEnv[env]?.takeIf { it.isNotBlank() }
        ?: keystoreProps.getProperty(prop)?.takeIf { it.isNotBlank() }

fun signingStoreFile(path: String): File {
    val configured = File(path)
    if (configured.isAbsolute) return configured
    val mobileRelative = File(mobileRootDir, path)
    if (mobileRelative.exists()) return mobileRelative
    return rootProject.file(path)
}

android {
    namespace = "com.onoffmypc.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.onoffmypc.android"
        minSdk = 26
        targetSdk = 35
        versionCode = 15
        versionName = "0.3.8"
        vectorDrawables { useSupportLibrary = true }

        // Google Sign-In server (Web) client ID used to request an ID token.
        // Public value; set GOOGLE_SERVER_CLIENT_ID in gradle.properties (or -P).
        // Empty by default → the app hides the Google button until configured.
        val googleServerClientId = (project.findProperty("GOOGLE_SERVER_CLIENT_ID") as String?) ?: ""
        buildConfigField("String", "GOOGLE_SERVER_CLIENT_ID", "\"$googleServerClientId\"")
        // Apple Services ID for Sign in with Apple (Android Custom Tab OIDC).
        val appleServicesId = (project.findProperty("APPLE_SERVICES_ID") as String?) ?: ""
        buildConfigField("String", "APPLE_SERVICES_ID", "\"$appleServicesId\"")
        // Microsoft Entra public client ID (Android Custom Tab OIDC).
        val microsoftClientId = (project.findProperty("MICROSOFT_CLIENT_ID") as String?) ?: ""
        buildConfigField("String", "MICROSOFT_CLIENT_ID", "\"$microsoftClientId\"")
    }

    signingConfigs {
        create("release") {
            val storePath = signingValue("KEYSTORE_FILE", "storeFile")
            if (storePath != null) {
                storeFile = signingStoreFile(storePath)
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

    // Google Sign-In via Credential Manager
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services.auth)
    implementation(libs.googleid)

    // Custom Tabs for Apple / Microsoft browser OIDC
    implementation(libs.androidx.browser)

    debugImplementation(libs.androidx.ui.tooling)
}
