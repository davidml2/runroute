// NetworkModule.kt
package com.runroute.app.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.runroute.app.BuildConfig
import com.runroute.app.data.api.ApiService
import com.runroute.app.data.api.RefreshTokenRequest
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

// ── Token Manager ───────────────────────────────────────────────
@Singleton
class TokenManager(private val dataStore: DataStore<Preferences>) {
    companion object {
        val ACCESS_TOKEN = stringPreferencesKey("access_token")
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
    }

    suspend fun saveTokens(accessToken: String, refreshToken: String) {
        dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN] = accessToken
            prefs[REFRESH_TOKEN] = refreshToken
        }
    }

    fun getAccessTokenSync(): String? = runBlocking {
        dataStore.data.map { it[ACCESS_TOKEN] }.first()
    }

    suspend fun getRefreshToken(): String? =
        dataStore.data.map { it[REFRESH_TOKEN] }.first()

    suspend fun clearTokens() {
        dataStore.edit { it.clear() }
    }
}

// ── Auth Interceptor (JWT 자동 첨부) ────────────────────────────
class AuthInterceptor(private val tokenManager: TokenManager) : okhttp3.Interceptor {
    override fun intercept(chain: okhttp3.Interceptor.Chain): Response {
        val token = tokenManager.getAccessTokenSync()
        val request = if (token != null) {
            chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}

// ── Token Refresh Authenticator ─────────────────────────────────
class TokenAuthenticator(
    private val tokenManager: TokenManager,
    private val apiService: dagger.Lazy<ApiService>,
) : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        if (response.code != 401) return null

        return runBlocking {
            val refreshToken = tokenManager.getRefreshToken() ?: return@runBlocking null
            try {
                val refreshResponse = apiService.get().refreshToken(RefreshTokenRequest(refreshToken))
                tokenManager.saveTokens(refreshResponse.accessToken, refreshToken)
                response.request.newBuilder()
                    .header("Authorization", "Bearer ${refreshResponse.accessToken}")
                    .build()
            } catch (e: Exception) {
                tokenManager.clearTokens()
                null
            }
        }
    }
}

// ── Hilt Network Module ─────────────────────────────────────────
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> =
        context.dataStore

    @Provides @Singleton
    fun provideTokenManager(dataStore: DataStore<Preferences>): TokenManager =
        TokenManager(dataStore)

    @Provides @Singleton
    fun provideOkHttp(
        tokenManager: TokenManager,
        authenticator: TokenAuthenticator,
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor(tokenManager))
        .authenticator(authenticator)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
                    else HttpLoggingInterceptor.Level.NONE
        })
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    @Provides @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    @Provides @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService =
        retrofit.create(ApiService::class.java)

    @Provides @Singleton
    fun provideTokenAuthenticator(
        tokenManager: TokenManager,
        apiService: dagger.Lazy<ApiService>,
    ): TokenAuthenticator = TokenAuthenticator(tokenManager, apiService)
}
