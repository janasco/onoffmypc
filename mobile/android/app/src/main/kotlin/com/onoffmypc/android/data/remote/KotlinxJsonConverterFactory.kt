package com.onoffmypc.android.data.remote

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.serializer
import okhttp3.MediaType
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ResponseBody
import retrofit2.Converter
import retrofit2.Retrofit
import java.lang.reflect.Type

/** Minimal Retrofit converter backed by kotlinx.serialization — self-contained so
 *  we don't depend on an external converter artifact. */
class KotlinxJsonConverterFactory(
    private val json: Json,
    private val contentType: MediaType,
) : Converter.Factory() {

    @OptIn(ExperimentalSerializationApi::class)
    override fun responseBodyConverter(
        type: Type,
        annotations: Array<out Annotation>,
        retrofit: Retrofit,
    ): Converter<ResponseBody, *> {
        @Suppress("UNCHECKED_CAST")
        val loader = json.serializersModule.serializer(type) as KSerializer<Any?>
        return Converter<ResponseBody, Any?> { body ->
            body.use { json.decodeFromString(loader, it.string()) }
        }
    }

    @OptIn(ExperimentalSerializationApi::class)
    override fun requestBodyConverter(
        type: Type,
        parameterAnnotations: Array<out Annotation>,
        methodAnnotations: Array<out Annotation>,
        retrofit: Retrofit,
    ): Converter<*, RequestBody> {
        @Suppress("UNCHECKED_CAST")
        val saver = json.serializersModule.serializer(type) as KSerializer<Any?>
        return Converter<Any?, RequestBody> { value ->
            json.encodeToString(saver, value).toRequestBody(contentType)
        }
    }
}
