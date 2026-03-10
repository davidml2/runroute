// RunRouteTileService.kt
package com.runroute.wear.tile

import android.content.Context
import androidx.wear.protolayout.ActionBuilders.*
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters
import androidx.wear.protolayout.DimensionBuilders.*
import androidx.wear.protolayout.LayoutElementBuilders.*
import androidx.wear.protolayout.ResourceBuilders.*
import androidx.wear.protolayout.TimelineBuilders.*
import androidx.wear.tiles.RequestBuilders.*
import androidx.wear.tiles.TileBuilders.*
import com.google.android.horologist.tiles.SuspendingTileService
import com.runroute.wear.data.WearRecordStore

/**
 * RunRoute Wear Tile
 * - 워치 페이스에서 스와이프하면 나타나는 빠른 실행 타일
 * - 최근 러닝 기록 요약 + 빠른 루트 찾기 버튼 제공
 */
class RunRouteTileService : SuspendingTileService() {

    companion object {
        private const val RESOURCES_VERSION = "1"
        private const val ACTION_OPEN_APP = "open_app"
    }

    override suspend fun resourcesRequest(requestParams: ResourcesRequest): Resources {
        return Resources.Builder()
            .setVersion(RESOURCES_VERSION)
            .build()
    }

    override suspend fun tileRequest(requestParams: TileRequest): Tile {
        val lastRecord = WearRecordStore.getLastRecord(this)

        return Tile.Builder()
            .setResourcesVersion(RESOURCES_VERSION)
            .setTileTimeline(
                Timeline.Builder()
                    .addTimelineEntry(
                        TimelineEntry.Builder()
                            .setLayout(buildLayout(requestParams.deviceConfiguration, lastRecord))
                            .build()
                    )
                    .build()
            )
            .build()
    }

    private fun buildLayout(device: DeviceParameters, lastRecord: WearRecordSummary?): Layout {
        return Layout.Builder()
            .setRoot(buildRoot(device, lastRecord))
            .build()
    }

    private fun buildRoot(device: DeviceParameters, lastRecord: WearRecordSummary?): LayoutElement {
        return Box.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .addContent(buildContent(device, lastRecord))
            .build()
    }

    private fun buildContent(device: DeviceParameters, lastRecord: WearRecordSummary?): LayoutElement {
        return Column.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .setHorizontalAlignment(HORIZONTAL_ALIGN_CENTER)
            .addContent(buildHeader())
            .addContent(buildStats(lastRecord))
            .addContent(buildStartButton())
            .build()
    }

    // ── 헤더 ────────────────────────────────────────────────
    private fun buildHeader(): LayoutElement =
        Text.Builder()
            .setText("🏃 RunRoute AI")
            .setFontStyle(
                FontStyle.Builder()
                    .setSize(sp(14f))
                    .setWeight(FONT_WEIGHT_BOLD)
                    .setColor(argb(0xFF60A5FA.toInt()))
                    .build()
            )
            .build()

    // ── 최근 기록 통계 ──────────────────────────────────────
    private fun buildStats(record: WearRecordSummary?): LayoutElement {
        val distText = record?.let { "${String.format("%.2f", it.distanceKm)}km" } ?: "기록 없음"
        val timeText = record?.formattedDuration ?: "--:--"
        val paceText = record?.formattedPace ?: "--'--\""

        return Row.Builder()
            .setWidth(expand())
            .setHeight(wrap())
            .addContent(buildStatCell("거리", distText))
            .addContent(buildStatCell("시간", timeText))
            .addContent(buildStatCell("페이스", paceText))
            .build()
    }

    private fun buildStatCell(label: String, value: String): LayoutElement =
        Column.Builder()
            .setWidth(weight(1f))
            .setHorizontalAlignment(HORIZONTAL_ALIGN_CENTER)
            .addContent(
                Text.Builder().setText(value)
                    .setFontStyle(FontStyle.Builder()
                        .setSize(sp(12f)).setWeight(FONT_WEIGHT_BOLD)
                        .setColor(argb(0xFFFFFFFF.toInt())).build())
                    .build()
            )
            .addContent(
                Text.Builder().setText(label)
                    .setFontStyle(FontStyle.Builder()
                        .setSize(sp(9f))
                        .setColor(argb(0xFF9CA3AF.toInt())).build())
                    .build()
            )
            .build()

    // ── 시작 버튼 ─────────────────────────────────────────
    private fun buildStartButton(): LayoutElement =
        androidx.wear.protolayout.LayoutElementBuilders.Column.Builder()
            .setWidth(expand())
            .setHeight(wrap())
            .setHorizontalAlignment(HORIZONTAL_ALIGN_CENTER)
            .addContent(
                Text.Builder()
                    .setText("▶ 루트 찾기")
                    .setModifiers(
                        androidx.wear.protolayout.ModifiersBuilders.Modifiers.Builder()
                            .setClickable(
                                androidx.wear.protolayout.ModifiersBuilders.Clickable.Builder()
                                    .setOnClick(
                                        LaunchAction.Builder()
                                            .setAndroidActivity(
                                                AndroidActivity.Builder()
                                                    .setClassName("com.runroute.wear.MainActivity")
                                                    .setPackageName(packageName)
                                                    .build()
                                            ).build()
                                    ).build()
                            ).build()
                    )
                    .setFontStyle(
                        FontStyle.Builder()
                            .setSize(sp(13f))
                            .setWeight(FONT_WEIGHT_BOLD)
                            .setColor(argb(0xFF3B82F6.toInt()))
                            .build()
                    )
                    .build()
            )
            .build()
}

// ── 기록 요약 데이터 ─────────────────────────────────────────
data class WearRecordSummary(
    val distanceKm: Double,
    val durationSeconds: Int,
    val avgPace: Double,
) {
    val formattedDuration: String
        get() {
            val m = durationSeconds / 60; val s = durationSeconds % 60
            return "${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}"
        }
    val formattedPace: String
        get() {
            if (avgPace <= 0) return "--'--\""
            val min = avgPace.toInt() / 60; val sec = avgPace.toInt() % 60
            return "$min'${sec.toString().padStart(2, '0')}\""
        }
}

object WearRecordStore {
    private const val PREFS_KEY = "wear_last_record"

    fun getLastRecord(context: Context): WearRecordSummary? {
        val prefs = context.getSharedPreferences("runroute_wear", Context.MODE_PRIVATE)
        val dist = prefs.getFloat("last_dist", 0f).toDouble()
        val dur = prefs.getInt("last_dur", 0)
        val pace = prefs.getFloat("last_pace", 0f).toDouble()
        return if (dist > 0) WearRecordSummary(dist, dur, pace) else null
    }

    fun saveRecord(context: Context, summary: WearRecordSummary) {
        context.getSharedPreferences("runroute_wear", Context.MODE_PRIVATE).edit()
            .putFloat("last_dist", summary.distanceKm.toFloat())
            .putInt("last_dur", summary.durationSeconds)
            .putFloat("last_pace", summary.avgPace.toFloat())
            .apply()
    }
}
