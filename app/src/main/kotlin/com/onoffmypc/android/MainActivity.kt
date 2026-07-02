package com.onoffmypc.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.OnOffMyPCTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            OnOffMyPCTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { padding ->
                    HomeScreen(Modifier.padding(padding))
                }
            }
        }
    }
}

@Composable
fun HomeScreen(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "OnOffMyPC",
            style = MaterialTheme.typography.headlineMedium,
        )
        Text(
            text = "Control your PC from anywhere.",
            style = MaterialTheme.typography.bodyMedium,
            color = Muted,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun HomeScreenPreview() {
    OnOffMyPCTheme { HomeScreen() }
}
