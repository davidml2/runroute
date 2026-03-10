// WearDataLayerService.kt
package com.runroute.wear.data

import android.util.Log
import com.google.android.gms.wearable.*
import com.google.android.gms.wearable.DataClient.OnDataChangedListener
import com.runroute.wear.tile.WearRecordStore
import com.runroute.wear.tile.WearRecordSummary
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import org.json.JSONObject
import javax.inject.Inject

/**
 * WearOS DataLayer Service
 * Android 폰 앱 ↔ WearOS 워치 앱 양방향 통신
 *
 * 경로(Path) 규칙:
 * /runroute/token       - 폰 → 워치: 인증 토큰 동기화
 * /runroute/routes      - 폰 → 워치: 추천 루트 전달
 * /runroute/location    - 워치 → 폰: 위치 업데이트
 * /runroute/completed   - 워치 → 폰: 러닝 완료 알림
 */
@AndroidEntryPoint
class WearDataLayerService : WearableListenerService() {

    @Inject lateinit var tokenManager: WearTokenManager

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // ── 폰에서 메시지 수신 ─────────────────────────────────
    override fun onMessageReceived(messageEvent: MessageEvent) {
        when (messageEvent.path) {
            "/runroute/token" -> handleTokenSync(messageEvent.data)
            "/runroute/routes" -> handleRoutesReceived(messageEvent.data)
            "/runroute/nav_update" -> handleNavUpdate(messageEvent.data)
        }
    }

    // ── 데이터 변경 수신 ───────────────────────────────────
    override fun onDataChanged(dataEvents: DataEventBuffer) {
        dataEvents.forEach { event ->
            if (event.type == DataEvent.TYPE_CHANGED) {
                when (event.dataItem.uri.path) {
                    "/runroute/token" -> {
                        val map = DataMapItem.fromDataItem(event.dataItem).dataMap
                        val token = map.getString("access_token", "")
                        if (token.isNotEmpty()) {
                            scope.launch { tokenManager.saveToken(token) }
                        }
                    }
                }
            }
        }
    }

    // ── 핸들러 ─────────────────────────────────────────────
    private fun handleTokenSync(data: ByteArray) {
        try {
            val json = JSONObject(String(data))
            val token = json.getString("access_token")
            scope.launch { tokenManager.saveToken(token) }
            Log.d("WearDataLayer", "토큰 동기화 완료")
        } catch (e: Exception) {
            Log.e("WearDataLayer", "토큰 파싱 실패: ${e.message}")
        }
    }

    private fun handleRoutesReceived(data: ByteArray) {
        // 루트 데이터를 로컬 저장소에 캐시 (오프라인 지원)
        try {
            val json = JSONObject(String(data))
            Log.d("WearDataLayer", "루트 데이터 수신: ${json.length()} routes")
            // TODO: WearRouteCache에 저장
        } catch (e: Exception) {
            Log.e("WearDataLayer", "루트 파싱 실패: ${e.message}")
        }
    }

    private fun handleNavUpdate(data: ByteArray) {
        try {
            val json = JSONObject(String(data))
            val instruction = json.getString("instruction")
            // NavigationViewModel로 전달
            WearNavUpdateBus.emit(instruction)
        } catch (e: Exception) {
            Log.e("WearDataLayer", "내비 업데이트 파싱 실패")
        }
    }

    // ── 워치 → 폰 메시지 전송 ──────────────────────────────
    fun sendToPhone(path: String, data: ByteArray) {
        Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nodes ->
            nodes.forEach { node ->
                Wearable.getMessageClient(this).sendMessage(node.id, path, data)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}

// ── 내비 업데이트 Event Bus ────────────────────────────────────
object WearNavUpdateBus {
    private val _updates = kotlinx.coroutines.flow.MutableSharedFlow<String>()
    val updates = _updates.asSharedFlow()

    fun emit(instruction: String) {
        CoroutineScope(Dispatchers.IO).launch { _updates.emit(instruction) }
    }
}
