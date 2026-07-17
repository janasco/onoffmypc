// Generated from @onoffmypc/design 0.1.0. Do not edit.
package com.onoffmypc.design.generated

enum class OnOffTone { Positive, Attention, Critical, Info, Neutral, PowerOn, PowerOff, PowerReset, Danger }

data class OnOffStatePresentation(
    val label: String,
    val tone: OnOffTone,
    val icon: String,
)

val OnOffCommandStates = mapOf(
    "pending" to OnOffStatePresentation("Queued", OnOffTone.Attention, "clock"),
    "sent" to OnOffStatePresentation("Awaiting acknowledgement", OnOffTone.Info, "send"),
    "delivered" to OnOffStatePresentation("Device acknowledged", OnOffTone.Info, "device-check"),
    "expired" to OnOffStatePresentation("Expired", OnOffTone.Critical, "expired"),
    "confirmed" to OnOffStatePresentation("PC state confirmed", OnOffTone.Positive, "check"),
)
