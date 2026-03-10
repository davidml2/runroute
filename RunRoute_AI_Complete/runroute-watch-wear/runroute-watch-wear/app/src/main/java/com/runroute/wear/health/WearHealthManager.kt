// WearHealthManager.kt
package com.runroute.wear.health

import android.content.Context
import androidx.health.services.client.ExerciseClient
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WearHealthManager @Inject constructor(@ApplicationContext private val ctx: Context) {

    private val healthClient = HealthServices.getClient(ctx)
    private val exerciseClient: ExerciseClient = healthClient.exerciseClient

    private val _heartRate = MutableStateFlow(0)
    val heartRate: StateFlow<Int> = _heartRate.asStateFlow()

    private val _calories = MutableStateFlow(0.0)
    val calories: StateFlow<Double> = _calories.asStateFlow()

    private val _distance = MutableStateFlow(0.0)
    val distance: StateFlow<Double> = _distance.asStateFlow()

    private val exerciseCallback = object : ExerciseUpdateCallback {
        override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
            val latest = update.latestMetrics

            latest.getData(DataType.HEART_RATE_BPM)?.lastOrNull()?.value?.let {
                _heartRate.value = it.toInt()
            }
            latest.getData(DataType.CALORIES_TOTAL)?.lastOrNull()?.total?.let {
                _calories.value = it
            }
            latest.getData(DataType.DISTANCE_TOTAL)?.lastOrNull()?.total?.let {
                _distance.value = it / 1000.0 // 미터 → km
            }
        }

        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) {}
        override fun onRegistered() {}
        override fun onRegistrationFailed(throwable: Throwable) {
            println("Exercise 등록 실패: ${throwable.message}")
        }
        override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) {}
    }

    // MARK: - 운동 세션 시작
    suspend fun startExercise() {
        val config = ExerciseConfig.builder(ExerciseType.RUNNING)
            .setDataTypes(setOf(
                DataType.HEART_RATE_BPM,
                DataType.CALORIES_TOTAL,
                DataType.DISTANCE_TOTAL,
                DataType.PACE,
            ))
            .setIsAutoPauseAndResumeEnabled(false)
            .build()

        exerciseClient.setUpdateCallback(exerciseCallback)
        exerciseClient.startExerciseAsync(config)
    }

    // MARK: - 운동 세션 종료
    suspend fun endExercise(): Triple<Int, Double, Double> {
        exerciseClient.endExerciseAsync()
        exerciseClient.clearUpdateCallbackAsync(exerciseCallback)
        return Triple(_heartRate.value, _calories.value, _distance.value)
    }
}
