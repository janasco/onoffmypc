package com.onoffmypc.android.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.onoffmypc.android.R

/** The OnOffMyPC brand mark. The rounded tile is part of the drawable so it
 *  reads on both light and dark themes. */
@Composable
fun AppLogo(
    modifier: Modifier = Modifier,
    size: Dp = 72.dp,
    contentDescription: String? = "OnOffMyPC logo",
) {
    Image(
        painter = painterResource(R.drawable.logo),
        contentDescription = contentDescription,
        contentScale = ContentScale.Fit,
        modifier = modifier.size(size),
    )
}
