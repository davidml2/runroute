plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.runroute.wear"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.runroute.wear"
        minSdk = 30   // WearOS 3.0
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "BASE_URL", "\"https://api.runroute.app/api/v1/\"")
    }

    buildFeatures { compose = true; buildConfig = true }
}

dependencies {
    // Wear Compose
    val wearComposeBom = platform("androidx.wear.compose:compose-bom:1.3.0")
    implementation(wearComposeBom)
    implementation("androidx.wear.compose:compose-material")
    implementation("androidx.wear.compose:compose-foundation")
    implementation("androidx.wear.compose:compose-navigation")
    implementation("androidx.wear.compose:compose-ui-tooling")
    implementation("com.google.android.horologist:horologist-compose-layout:0.6.8")

    // Tiles API (워치 페이스 타일)
    implementation("androidx.wear.tiles:tiles:1.4.0")
    implementation("androidx.wear.tiles:tiles-material:1.4.0")
    implementation("com.google.android.horologist:horologist-tiles:0.6.8")

    // Complications (워치 페이스 컴플리케이션)
    implementation("androidx.wear:wear-complications-data:1.2.1")
    implementation("androidx.wear:wear-complications-provider:1.2.1")

    // Health Services (심박수, 운동)
    implementation("androidx.health:health-services-client:1.1.0-alpha03")

    // DataLayer API (폰 ↔ 워치 통신)
    implementation("com.google.android.gms:play-services-wearable:18.1.0")

    // Hilt
    implementation("com.google.dagger:hilt-android:2.50")
    ksp("com.google.dagger:hilt-compiler:2.50")
    implementation("androidx.hilt:hilt-navigation-compose:1.1.0")

    // Retrofit
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // DataStore
    implementation("androidx.datastore:datastore-preferences:1.0.0")

    // Location
    implementation("com.google.android.gms:play-services-location:21.1.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
