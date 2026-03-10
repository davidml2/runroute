// AuthScreen.kt
package com.runroute.app.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.runroute.app.data.repository.AuthRepository
import com.runroute.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

// ── Auth ViewModel ────────────────────────────────────────────
data class AuthState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val isLoggedIn: Boolean = false,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepo: AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(AuthState())
    val state: StateFlow<AuthState> = _state.asStateFlow()

    val isLoggedIn: Boolean get() = authRepo.isLoggedIn()

    fun login(email: String, password: String) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        when (val result = authRepo.login(email, password)) {
            is Result.Success -> _state.update { it.copy(isLoading = false, isLoggedIn = true) }
            is Result.Error   -> _state.update { it.copy(isLoading = false, error = result.message) }
            else -> {}
        }
    }

    fun register(email: String, password: String, name: String) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        when (val result = authRepo.register(email, password, name)) {
            is Result.Success -> _state.update { it.copy(isLoading = false, isLoggedIn = true) }
            is Result.Error   -> _state.update { it.copy(isLoading = false, error = result.message) }
            else -> {}
        }
    }

    fun logout() = viewModelScope.launch { authRepo.logout() }
    fun clearError() = _state.update { it.copy(error = null) }
}

// ── Auth Screen ───────────────────────────────────────────────
@Composable
fun AuthScreen(onSuccess: () -> Unit, vm: AuthViewModel = hiltViewModel()) {
    val state by vm.state.collectAsState()
    var isRegister by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    LaunchedEffect(state.isLoggedIn) { if (state.isLoggedIn) onSuccess() }

    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        // 로고
        Text("🏃", fontSize = 64.sp)
        Spacer(Modifier.height(8.dp))
        Text("RunRoute AI", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("어디서든 최적의 러닝 루트", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(40.dp))

        // 입력 폼
        if (isRegister) {
            OutlinedTextField(value = name, onValueChange = { name = it },
                label = { Text("이름") },
                leadingIcon = { Icon(Icons.Default.Person, null) },
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            Spacer(Modifier.height(12.dp))
        }

        OutlinedTextField(value = email, onValueChange = { email = it },
            label = { Text("이메일") },
            leadingIcon = { Icon(Icons.Default.Email, null) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
        Spacer(Modifier.height(12.dp))

        OutlinedTextField(value = password, onValueChange = { password = it },
            label = { Text("비밀번호") },
            leadingIcon = { Icon(Icons.Default.Lock, null) },
            trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                }
            },
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))

        state.error?.let { error ->
            Spacer(Modifier.height(8.dp))
            Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }

        Spacer(Modifier.height(24.dp))
        Button(
            onClick = { if (isRegister) vm.register(email, password, name) else vm.login(email, password) },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            enabled = !state.isLoading,
            shape = RoundedCornerShape(14.dp),
        ) {
            if (state.isLoading) CircularProgressIndicator(Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
            else Text(if (isRegister) "회원가입" else "로그인", fontWeight = FontWeight.Bold)
        }

        Spacer(Modifier.height(16.dp))
        TextButton(onClick = { isRegister = !isRegister; vm.clearError() }) {
            Text(if (isRegister) "이미 계정이 있어요 → 로그인" else "계정이 없어요 → 회원가입")
        }
    }
}
