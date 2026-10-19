# Keep rules for when R8/minification is enabled on release
# (buildTypes.release.isMinifyEnabled = true). Retrofit and OkHttp ship their
# own consumer rules; these cover kotlinx.serialization's generated serializers.

-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

# kotlinx.serialization: keep @Serializable classes and their generated serializers.
-keepclassmembers class com.onoffmypc.android.** {
    *** Companion;
}
-keepclasseswithmembers class com.onoffmypc.android.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.onoffmypc.android.**$$serializer { *; }

# Retrofit interface methods use generics/annotations reflectively.
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
