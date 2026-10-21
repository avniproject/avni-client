package com.openchsclient.clinicsharing

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.openchsclient.R

// connectedDevice, not dataSync: Android 15 caps dataSync at about 6 hours a day, shorter than a clinic.
class ClinicHubForegroundService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null
    private var role = ROLE_HUB

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            ClinicHubModule.emitStopRequested(role)
            stopSelf()
            return START_NOT_STICKY
        }
        role = intent?.getStringExtra(EXTRA_ROLE) ?: ROLE_HUB
        createChannel()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE)
        } else {
            startForeground(NOTIFICATION_ID, buildNotification())
        }
        // A joined phone syncs only while on screen, so only the hub keeps the CPU awake.
        if (role == ROLE_HUB) acquireWakeLock() else releaseWakeLock()
        // The hub itself lives in JS; if the process dies there is nothing for a restarted service to serve.
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        releaseWakeLock()
        super.onDestroy()
    }

    private fun releaseWakeLock() {
        wakeLock?.takeIf { it.isHeld }?.release()
        wakeLock = null
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "avni:clinicHub").apply {
            setReferenceCounted(false)
            acquire(WAKE_LOCK_TIMEOUT_MS)
        }
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(CHANNEL_ID, getString(R.string.clinic_hub_channel_name), NotificationManager.IMPORTANCE_LOW)
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle(getString(if (role == ROLE_PHONE) R.string.clinic_phone_notification_title else R.string.clinic_hub_notification_title))
        .setContentText(getString(if (role == ROLE_PHONE) R.string.clinic_phone_notification_text else R.string.clinic_hub_notification_text))
        .setSmallIcon(android.R.drawable.stat_notify_sync)
        .setOngoing(true)
        .setContentIntent(openAppIntent())
        .addAction(0, getString(if (role == ROLE_PHONE) R.string.clinic_phone_leave else R.string.clinic_hub_stop), stopIntent())
        .build()

    private fun openAppIntent(): PendingIntent? = packageManager.getLaunchIntentForPackage(packageName)?.let {
        PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    private fun stopIntent(): PendingIntent = PendingIntent.getService(
        this, 1, Intent(this, ClinicHubForegroundService::class.java).setAction(ACTION_STOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    companion object {
        const val EXTRA_ROLE = "role"
        const val ROLE_HUB = "hub"
        const val ROLE_PHONE = "phone"
        @Volatile var runningRole: String? = null
        private const val CHANNEL_ID = "clinic_hub"
        private const val NOTIFICATION_ID = 7373
        private const val ACTION_STOP = "com.openchsclient.clinicsharing.STOP_HUB"
        private const val WAKE_LOCK_TIMEOUT_MS = 12 * 60 * 60 * 1000L
    }
}
