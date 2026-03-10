// WearApplication.kt
package com.runroute.wear

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class WearApplication : Application()

// ── WearDiModule.kt ───────────────────────────────────────────
// WearDiModule.kt
package com.runroute.wear.di

import android.content.Context
import com.runroute.wear.data.WearApiService
import com.runroute.wear.data.WearTokenManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object WearDiModule {

    private const val BASE_URL = "https://api.runroute.app/api/v1/"

    @Provides @Singleton
    fun provideOkHttp(tokenManager: WearTokenManager): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(Interceptor { chain ->
                val token = runBlocking { tokenManager.getToken() }
                val req = if (token != null) {
                    chain.request().newBuilder()
                        .header("Authorization", "Bearer $token").build()
                } else chain.request()
                chain.proceed(req)
            })
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            })
            .build()

    @Provides @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL).client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    @Provides @Singleton
    fun provideApiService(retrofit: Retrofit): WearApiService =
        retrofit.create(WearApiService::class.java)
}
