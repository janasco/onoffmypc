# R8 keep rules. Play's DEX optimization requirement (from February 2027)
# requires at least 25% optimization, shrinking, and obfuscation for apps with
# more than 10 MB of DEX. Do not add a global -dontobfuscate.

-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepattributes AnnotationDefault

-keep class kotlin.Metadata { *; }
-dontwarn kotlin.Unit
-dontwarn kotlinx.coroutines.**

# kotlinx.serialization: keep generated serializers and Companion.serializer().
# The models live in com.onoffmypc.shared.model and the app's typealiases.
-keepclassmembers class com.onoffmypc.** {
    *** Companion;
}
-keepclasseswithmembers class com.onoffmypc.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.onoffmypc.**$$serializer { *; }

-if @kotlinx.serialization.Serializable class **
-keepclassmembers class <1> {
    static <1>$Companion Companion;
}
-if @kotlinx.serialization.Serializable class **
-keepclassmembers class <1>$Companion {
    kotlinx.serialization.KSerializer serializer(...);
}
-if @kotlinx.serialization.Serializable class ** {
    public static ** INSTANCE;
}
-keepclassmembers class <1> {
    public static <1> INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}

# Retrofit uses reflection for interface methods, generic signatures, and
# annotations. These are the rules recommended by Retrofit for R8 full mode.
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface <1>
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*

# OkHttp optional platform integrations.
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
