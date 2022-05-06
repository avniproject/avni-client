package com.openchsclient.module;
//Credits: https://www.qed42.com/insights/coe/javascript/react-native-endless-background-process
import android.app.*;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.util.Log;
import com.facebook.react.HeadlessJsTaskService;

public class BackgroundJobService extends Service {

    private static final int SERVICE_NOTIFICATION_ID = 100001;
    private static final String CHANNEL_ID = "AVNI_BACKGROUND";
    private final String TAG = "BackgroundJobService";
    private Handler jobHandler = new Handler();
    private Runnable syncJob = new Runnable() {
        @Override
        public void run() {
            Context context = getApplicationContext();
            Intent myIntent = new Intent(context, SyncJobEventService.class);
            Log.d(TAG, "Starting background sync job");
            context.startService(myIntent);
            HeadlessJsTaskService.acquireWakeLockNow(context);
            jobHandler.postDelayed(this, 60 * 60 * 1000);
        }
    };

    private Runnable deleteDraftsJob = new Runnable() {
        @Override
        public void run() {
            Context context = getApplicationContext();
            Intent myIntent = new Intent(context, DeleteDraftsJobEventService.class);
            Log.d(TAG, "Starting background delete draft job");
            context.startService(myIntent);
            HeadlessJsTaskService.acquireWakeLockNow(context);
            jobHandler.postDelayed(this, 1 * 24 * 60 * 60 * 1000);
        }
    };

    private Runnable pruneMediaJob = new Runnable() {
        @Override
        public void run() {
            Context context = getApplicationContext();
            Intent myIntent = new Intent(context, PruneMediaJobEventService.class);
            Log.d(TAG, "Starting background prune media job");
            context.startService(myIntent);
            HeadlessJsTaskService.acquireWakeLockNow(context);
            jobHandler.postDelayed(this, 1 * 24 * 60 * 60 * 1000);
        }
    };

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        this.jobHandler.removeCallbacks(this.syncJob);
        this.jobHandler.removeCallbacks(this.deleteDraftsJob);
        this.jobHandler.removeCallbacks(this.pruneMediaJob);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        this.jobHandler.post(this.syncJob);
        this.jobHandler.post(this.deleteDraftsJob);
        this.jobHandler.post(this.pruneMediaJob);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, CHANNEL_ID, NotificationManager.IMPORTANCE_MIN);
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.createNotificationChannel(channel);
            Notification notification = new Notification.Builder(this, CHANNEL_ID)
                    .setWhen(System.currentTimeMillis())
                    .setSmallIcon(getResources().getIdentifier(CHANNEL_ID, "drawable", getApplicationContext().getPackageName()))
                    .build();
            startForeground(SERVICE_NOTIFICATION_ID, notification);
        }
        return START_STICKY_COMPATIBILITY;
    }

}
