package com.onoffmypc.android.data.model

/**
 * Re-exports shared API models so existing `:app` imports keep working after the
 * `:shared:model` extract. Prefer importing `com.onoffmypc.shared.model` in new code.
 */
typealias LoginRequest = com.onoffmypc.shared.model.LoginRequest
typealias GoogleAuthRequest = com.onoffmypc.shared.model.GoogleAuthRequest
typealias SocialAuthRequest = com.onoffmypc.shared.model.SocialAuthRequest
typealias RegisterRequest = com.onoffmypc.shared.model.RegisterRequest
typealias ForgotPasswordRequest = com.onoffmypc.shared.model.ForgotPasswordRequest
typealias ChangeEmailRequest = com.onoffmypc.shared.model.ChangeEmailRequest
typealias ChangePasswordRequest = com.onoffmypc.shared.model.ChangePasswordRequest
typealias PushRegisterRequest = com.onoffmypc.shared.model.PushRegisterRequest
typealias RegisterResponse = com.onoffmypc.shared.model.RegisterResponse
typealias OkResponse = com.onoffmypc.shared.model.OkResponse
typealias Plan = com.onoffmypc.shared.model.Plan
typealias PaymentRequestItem = com.onoffmypc.shared.model.PaymentRequestItem
typealias BillingDevice = com.onoffmypc.shared.model.BillingDevice
typealias BillingStatus = com.onoffmypc.shared.model.BillingStatus
typealias CheckoutRequest = com.onoffmypc.shared.model.CheckoutRequest
typealias CheckoutResponse = com.onoffmypc.shared.model.CheckoutResponse
typealias PortalResponse = com.onoffmypc.shared.model.PortalResponse
typealias MeResponse = com.onoffmypc.shared.model.MeResponse
typealias Device = com.onoffmypc.shared.model.Device
typealias DeviceStatus = com.onoffmypc.shared.model.DeviceStatus
typealias Telemetry = com.onoffmypc.shared.model.Telemetry
typealias HistoryPoint = com.onoffmypc.shared.model.HistoryPoint
typealias DeviceNameRequest = com.onoffmypc.shared.model.DeviceNameRequest
typealias NewDevice = com.onoffmypc.shared.model.NewDevice
typealias DeletedResponse = com.onoffmypc.shared.model.DeletedResponse
typealias Command = com.onoffmypc.shared.model.Command
typealias CommandRequest = com.onoffmypc.shared.model.CommandRequest
typealias CommandResponse = com.onoffmypc.shared.model.CommandResponse
typealias ApiError = com.onoffmypc.shared.model.ApiError
typealias ApiException = com.onoffmypc.shared.model.ApiException
typealias CommandType = com.onoffmypc.shared.model.CommandType
typealias PairCodeResponse = com.onoffmypc.shared.model.PairCodeResponse
